const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setHotkeys: (hotkeys) => ipcRenderer.invoke('set-hotkeys', hotkeys),
  getStatus: () => ipcRenderer.invoke('get-status'),
  playerAction: (action) => ipcRenderer.invoke('player-action', action),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onTrackUpdate: (callback) => {
    const listener = (_evt, state) => callback(state);
    ipcRenderer.on('track-update', listener);
    return () => ipcRenderer.removeListener('track-update', listener);
  }
});
