const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } = require('electron');
const path = require('path');

const { Store } = require('./src/store');
const media = require('./src/mediaControl');
const { registerHotkeys, unregisterHotkeys } = require('./src/hotkeys');

let store;
let tray;
let settingsWindow = null;
let miniPlayerWindow = null;
let miniPlayerVisible = false;

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 780,
    height: 600,
    minWidth: 600,
    minHeight: 460,
    title: 'KeyTunes',
    backgroundColor: '#14151A',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings', 'index.html'));

  settingsWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      settingsWindow.hide();
    }
  });
}

function createMiniPlayerWindow() {
  miniPlayerWindow = new BrowserWindow({
    width: 400,
    height: 160,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  miniPlayerWindow.loadFile(path.join(__dirname, 'renderer', 'miniplayer', 'index.html'));

  miniPlayerWindow.on('blur', () => {
    if (miniPlayerVisible) hideMiniPlayer();
  });
}

function positionMiniPlayerNearTray() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const winBounds = miniPlayerWindow.getBounds();
  const x = width - winBounds.width - 16;
  const y = height - winBounds.height - 16;
  miniPlayerWindow.setBounds({ x, y, width: winBounds.width, height: winBounds.height });
}

function showMiniPlayer() {
  if (!miniPlayerWindow) createMiniPlayerWindow();
  positionMiniPlayerNearTray();
  miniPlayerWindow.show();
  miniPlayerWindow.focus();
  miniPlayerVisible = true;
  refreshMiniPlayerTrack();
}

function hideMiniPlayer() {
  if (miniPlayerWindow) miniPlayerWindow.hide();
  miniPlayerVisible = false;
}

function toggleMiniPlayer() {
  if (miniPlayerVisible) hideMiniPlayer();
  else showMiniPlayer();
}

async function refreshMiniPlayerTrack() {
  if (!miniPlayerWindow) return;
  try {
    const status = await media.getStatus();
    miniPlayerWindow.webContents.send('track-update', status);
  } catch (err) {
    miniPlayerWindow.webContents.send('track-update', { active: false });
  }
}

function buildTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon-16.png');
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);
  tray.setToolTip('KeyTunes');

  const menu = Menu.buildFromTemplate([
    { label: 'Show Mini Player', click: () => showMiniPlayer() },
    { label: 'Open Hotkey Settings', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => toggleMiniPlayer());
}

function wireHotkeys() {
  const actions = {
    playPause: () => media.playPause().finally(refreshMiniPlayerTrack),
    next: () => media.next().finally(refreshMiniPlayerTrack),
    previous: () => media.previous().finally(refreshMiniPlayerTrack),
    volumeUp: () => media.volumeUp(),
    volumeDown: () => media.volumeDown(),
    toggleMiniPlayer: () => toggleMiniPlayer()
  };

  return registerHotkeys(store, actions, (action, err) => {
    console.error(`Hotkey action "${action}" failed:`, err.message);
  });
}

// ---------- IPC ----------

function setupIpc() {
  ipcMain.handle('get-config', () => store.getAll());

  ipcMain.handle('set-hotkeys', (_evt, hotkeys) => {
    store.set('hotkeys', hotkeys);
    const failed = wireHotkeys();
    return { failed };
  });

  ipcMain.handle('get-status', () => media.getStatus().catch(() => ({ active: false })));

  ipcMain.handle('player-action', async (_evt, action) => {
    const map = {
      playPause: () => media.playPause(),
      next: () => media.next(),
      previous: () => media.previous(),
      volumeUp: () => media.volumeUp(),
      volumeDown: () => media.volumeDown()
    };
    if (map[action.type]) {
      await map[action.type]();
      refreshMiniPlayerTrack();
    }
  });

  ipcMain.handle('set-volume', async (_evt, level) => {
    await media.setVolume(level);
    refreshMiniPlayerTrack();
  });

  ipcMain.handle('open-external', (_evt, url) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
  });
}

// ---------- App lifecycle ----------

app.whenReady().then(() => {
  if (process.platform !== 'win32') {
    console.warn('KeyTunes uses Windows-only APIs (System Media Transport Controls). It will not control playback on this OS.');
  }

  store = new Store();

  setupIpc();
  buildTray();
  createMiniPlayerWindow();
  wireHotkeys();
  createSettingsWindow();

  setInterval(() => {
    if (miniPlayerVisible) refreshMiniPlayerTrack();
  }, 3000);
});

app.on('window-all-closed', () => {
  // Keep running in the background (tray app)
});

app.on('before-quit', () => {
  app.isQuitting = true;
  unregisterHotkeys();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createSettingsWindow();
});
