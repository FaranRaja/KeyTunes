const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_HOTKEYS = {
  playPause: '',
  next: '',
  previous: '',
  volumeUp: '',
  volumeDown: '',
  toggleMiniPlayer: ''
};

const DEFAULTS = {
  hotkeys: DEFAULT_HOTKEYS
};

class Store {
  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'config.json');
    this.data = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed, hotkeys: { ...DEFAULT_HOTKEYS, ...(parsed.hotkeys || {}) } };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  _save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this._save();
  }

  getAll() {
    return this.data;
  }
}

module.exports = { Store, DEFAULT_HOTKEYS };
