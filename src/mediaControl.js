const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'spotify-control.ps1');

let ps;
let rl;
let pendingStatus = [];

function init() {
  if (ps) return;
  ps = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-WindowStyle', 'Hidden',
    '-ExecutionPolicy', 'Bypass',
    '-File', SCRIPT_PATH
  ], { windowsHide: true });

  rl = readline.createInterface({ input: ps.stdout });
  rl.on('line', (line) => {
    line = line.trim();
    if (!line) return;
    if (line.startsWith('{')) {
      const req = pendingStatus.shift();
      if (req) {
        try { req.resolve(JSON.parse(line)); }
        catch { req.resolve({ active: false }); }
      }
    }
  });

  ps.on('close', () => { ps = null; rl = null; });
}

function sendAction(action) {
  init();
  ps.stdin.write(action + '\n');
}

function playPause() { sendAction('PlayPause'); return Promise.resolve(); }
function next() { sendAction('Next'); return Promise.resolve(); }
function previous() { sendAction('Previous'); return Promise.resolve(); }
function volumeUp() { sendAction('VolumeUp'); return Promise.resolve(); }
function volumeDown() { sendAction('VolumeDown'); return Promise.resolve(); }
function setVolume(level) { sendAction(`SetVolume ${level}`); return Promise.resolve(); }

function getStatus() {
  init();
  return new Promise((resolve) => {
    pendingStatus.push({ resolve });
    ps.stdin.write('Status\n');
  });
}

module.exports = { playPause, next, previous, volumeUp, volumeDown, setVolume, getStatus };
