const { spawn } = require('child_process');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'spotify-control.ps1');

function runPs(action) {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle', 'Hidden',
      '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT_PATH,
      '-Action', action
    ], { windowsHide: true });

    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (d) => { stdout += d.toString(); });
    ps.stderr.on('data', (d) => { stderr += d.toString(); });

    ps.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `powershell exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });

    ps.on('error', (err) => {
      // Most common cause: not running on Windows, or powershell.exe not on PATH
      reject(err);
    });
  });
}

async function playPause() { await runPs('PlayPause'); }
async function next() { await runPs('Next'); }
async function previous() { await runPs('Previous'); }
async function volumeUp() { await runPs('VolumeUp'); }
async function volumeDown() { await runPs('VolumeDown'); }

async function getStatus() {
  const out = await runPs('Status');
  try {
    return JSON.parse(out);
  } catch {
    return { active: false };
  }
}

module.exports = { playPause, next, previous, volumeUp, volumeDown, getStatus };
