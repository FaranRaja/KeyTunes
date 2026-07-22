const HOTKEY_META = [
  { key: 'playPause', name: 'Play / Pause', desc: 'Toggle playback', icon: iconPlayPause() },
  { key: 'next', name: 'Next track', desc: 'Skip forward', icon: iconNext() },
  { key: 'previous', name: 'Previous track', desc: 'Skip back', icon: iconPrev() },
  { key: 'volumeUp', name: 'Volume up', desc: '+10%', icon: iconVolUp() },
  { key: 'volumeDown', name: 'Volume down', desc: '-10%', icon: iconVolDown() },
  { key: 'toggleMiniPlayer', name: 'Mini player', desc: 'Show / hide the tray player', icon: iconMini() }
];

let currentHotkeys = {};
let listeningFor = null;

function iconPlayPause() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`; }
function iconNext() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l8-7zM16 5v14h2V5z"/></svg>`; }
function iconPrev() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 5v14l-8-7zM6 5v14h2V5z"/></svg>`; }
function iconVolUp() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4zm11.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>`; }
function iconVolDown() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z"/></svg>`; }
function iconMini() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="7" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="13" r="2.4" fill="currentColor"/></svg>`; }

function acceleratorToParts(accelerator) {
  if (!accelerator) return ['—'];
  return accelerator.split('+');
}

function renderKeycapCombo(accelerator) {
  const parts = acceleratorToParts(accelerator);
  return parts
    .map((p, i) => `<span class="keycap">${p}</span>${i < parts.length - 1 ? '<span class="keycap-plus">+</span>' : ''}`)
    .join('');
}

function renderHotkeyList() {
  const list = document.getElementById('hotkey-list');
  list.innerHTML = '';

  for (const meta of HOTKEY_META) {
    const row = document.createElement('div');
    row.className = 'hotkey-row';
    row.innerHTML = `
      <div class="hotkey-info">
        <div class="hotkey-icon">${meta.icon}</div>
        <div>
          <div class="hotkey-name">${meta.name}</div>
          <div class="hotkey-desc">${meta.desc}</div>
        </div>
      </div>
      <div class="keycap-combo" data-key="${meta.key}">${renderKeycapCombo(currentHotkeys[meta.key])}</div>
    `;
    list.appendChild(row);
  }

  list.querySelectorAll('.keycap-combo').forEach((el) => {
    el.addEventListener('click', () => startListening(el, el.dataset.key));
  });
}

function startListening(el, hotkeyKey) {
  if (listeningFor) return;
  listeningFor = hotkeyKey;
  el.classList.add('listening');
  el.innerHTML = `<span class="keycap">Press keys&hellip;</span>`;

  const onKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      cleanup();
      renderHotkeyList();
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      cleanup();
      currentHotkeys[hotkeyKey] = '';
      renderHotkeyList();
      persistHotkeys();
      return;
    }

    const accelerator = eventToAccelerator(e);
    if (!accelerator || isModifierOnly(e)) return; // wait for a real key

    cleanup();
    currentHotkeys[hotkeyKey] = accelerator;
    renderHotkeyList();
    persistHotkeys();
  };

  const onClickOutside = (e) => {
    if (el.contains(e.target)) return;
    cleanup();
    renderHotkeyList();
  };

  function cleanup() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('mousedown', onClickOutside, true);
    listeningFor = null;
  }

  setTimeout(() => {
    if (listeningFor === hotkeyKey) {
      window.addEventListener('mousedown', onClickOutside, true);
    }
  }, 10);

  window.addEventListener('keydown', onKeyDown, true);
}

function isModifierOnly(e) {
  return ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key);
}

const SPECIAL_KEYS = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Escape: 'Escape',
  Enter: 'Return',
  Tab: 'Tab',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  MediaPlayPause: 'MediaPlayPause',
  MediaTrackNext: 'MediaNextTrack',
  MediaTrackPrevious: 'MediaPreviousTrack',
  AudioVolumeUp: 'VolumeUp',
  AudioVolumeDown: 'VolumeDown',
  AudioVolumeMute: 'VolumeMute',
  Insert: 'Insert'
};

function eventToAccelerator(e) {
  const mods = [];
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');

  let key = e.key;
  if (key.startsWith('Numpad')) {
    key = 'num' + key.replace('Numpad', '').toLowerCase();
  }

  if (SPECIAL_KEYS[key]) {
    key = SPECIAL_KEYS[key];
  } else if (/^[a-zA-Z]$/.test(key)) {
    key = key.toUpperCase();
  } else if (/^[0-9]$/.test(key)) {
    key = key;
  } else if (/^F[1-9][0-9]?$/.test(key)) {
    key = key;
  } else if (key.length > 1) {
    key = key; // Fallback for other special keys (e.g., media keys)
  } else {
    key = key.length === 1 ? key.toUpperCase() : null;
  }

  if (!key) return null;

  return [...mods, key].join('+');
}

async function persistHotkeys() {
  const result = await window.api.setHotkeys(currentHotkeys);
  if (result.failed && result.failed.length) {
    console.warn('Some hotkeys failed to register (likely already used by another app):', result.failed);
  }
}

// ---------- Spotify detection status ----------

async function refreshStatus() {
  const status = await window.api.getStatus().catch(() => ({ active: false }));
  const pill = document.getElementById('status-pill');
  const label = pill.querySelector('.status-label');

  pill.classList.remove('status-unknown', 'status-connected', 'status-disconnected');
  if (status && status.active) {
    pill.classList.add('status-connected');
    label.textContent = status.title ? `Playing: ${status.title}` : 'Spotify detected';
  } else {
    pill.classList.add('status-unknown');
    label.textContent = 'Spotify not detected';
  }
}

async function init() {
  const config = await window.api.getConfig();
  currentHotkeys = { ...config.hotkeys };
  renderHotkeyList();

  await refreshStatus();
  setInterval(refreshStatus, 4000);
}

init();
