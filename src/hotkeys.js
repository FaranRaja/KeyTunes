const { GlobalKeyboardListener } = require("node-global-key-listener");

let listener = null;
let currentHotkeys = {};
let actionsMap = {};

function parseAccelerator(acc) {
  if (!acc) return null;
  const parts = acc.split('+');
  const key = parts.pop().toUpperCase();
  const mods = parts.map(p => p.toUpperCase());
  return { key, mods };
}

function handleKeyDown(e, down) {
  if (e.state !== "DOWN") return;
  
  const keyName = e.name.toUpperCase();
  
  const pressedMods = [];
  if (down["LEFT CTRL"] || down["RIGHT CTRL"]) pressedMods.push("CONTROL");
  if (down["LEFT ALT"] || down["RIGHT ALT"]) pressedMods.push("ALT");
  if (down["LEFT SHIFT"] || down["RIGHT SHIFT"]) pressedMods.push("SHIFT");
  if (down["LEFT META"] || down["RIGHT META"]) pressedMods.push("SUPER");

  for (const [action, parsed] of Object.entries(currentHotkeys)) {
    if (!parsed) continue;
    
    let matchKey = parsed.key;
    if (matchKey === 'MEDIAPLAYPAUSE') matchKey = 'PLAY/PAUSE';
    else if (matchKey === 'MEDIANEXTTRACK') matchKey = 'NEXT TRACK';
    else if (matchKey === 'MEDIAPREVIOUSTRACK') matchKey = 'PREVIOUS TRACK';
    else if (matchKey === 'VOLUMEUP') matchKey = 'VOLUME UP';
    else if (matchKey === 'VOLUMEDOWN') matchKey = 'VOLUME DOWN';
    else if (matchKey === 'VOLUMEMUTE') matchKey = 'VOLUME MUTE';
    else if (matchKey === 'RETURN') matchKey = 'ENTER';
    
    let isKeyMatch = (keyName === matchKey) || (keyName.replace(' ARROW', '') === matchKey) || (keyName.replace('ARROW', '').trim() === matchKey);

    if (!isKeyMatch) continue;

    const hasCtrl = pressedMods.includes('CONTROL');
    const hasAlt = pressedMods.includes('ALT');
    const hasShift = pressedMods.includes('SHIFT');
    const hasSuper = pressedMods.includes('SUPER');

    const requiresCtrl = parsed.mods.includes('CONTROL');
    const requiresAlt = parsed.mods.includes('ALT');
    const requiresShift = parsed.mods.includes('SHIFT');
    const requiresSuper = parsed.mods.includes('SUPER');

    if (requiresCtrl === hasCtrl && 
        requiresAlt === hasAlt && 
        requiresShift === hasShift && 
        requiresSuper === hasSuper) {
        
        Promise.resolve(actionsMap[action]()).catch(console.error);
    }
  }
}

function registerHotkeys(store, actions, onError) {
  if (!listener) {
    // node-global-key-listener spawns a process or hook to listen
    listener = new GlobalKeyboardListener({ windows: { serverPath: undefined } });
    listener.addListener(handleKeyDown);
  }
  
  const hotkeys = store.get('hotkeys');
  currentHotkeys = {};
  actionsMap = actions;

  for (const [action, acc] of Object.entries(hotkeys)) {
    if (!acc || !actions[action]) continue;
    currentHotkeys[action] = parseAccelerator(acc);
  }
  
  return []; // No failures on registration with a passive listener
}

function unregisterHotkeys() {
  if (listener) {
    listener.kill();
    listener = null;
  }
  currentHotkeys = {};
}

module.exports = { registerHotkeys, unregisterHotkeys };
