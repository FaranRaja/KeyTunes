# KeyTunes

<p align="center">
  <img src="assets/icon.png" width="150" alt="KeyTunes Logo">
</p>

KeyTunes is a lightweight, ultra-fast background application that adds custom, passive global hotkeys and a sleek mini player to Spotify on Windows.

Unlike other Spotify controllers, KeyTunes does **not** rely on slow web scrapers, simulated keypresses, or the Premium Spotify Web API. Instead, it hooks directly into the native Windows Media Control APIs and the Windows Audio COM Session to deliver instant, zero-lag volume and playback controls.

## Features

- **Passive Global Hotkeys:** Control Spotify from anywhere, even while gaming. The app listens passively without blocking other inputs.
- **Zero-Lag Volume Control:** Uses the native Windows Audio `IAudioSessionControl` API for instantaneous 2% volume adjustments that you can hold down without freezing your system.
- **Sleek Mini Player:** A floating, drag-and-drop mini player that stays out of your way.
- **High-Res Album Art:** Bypasses low-quality Windows thumbnails and automatically fetches gorgeous 600x600 album art from the public iTunes database.

## Installation

1. Go to the [Releases](https://github.com/FaranRaja/KeyTunes/releases) page.
2. Download the latest `KeyTunes Setup.exe`.
3. Run the installer and you're good to go!

## Usage

Once installed, KeyTunes will sit quietly in your system tray. You can right-click the tray icon to access:
- **Hotkeys:** Rebind your playback and volume hotkeys.
- **Mini Player:** Open the floating player to see what's currently playing.
- **Quit:** Completely exit the application.

### Default Hotkeys
- `CTRL+SHIFT+UP`: Volume Up
- `CTRL+SHIFT+DOWN`: Volume Down
- `CTRL+SHIFT+LEFT`: Previous Track
- `CTRL+SHIFT+RIGHT`: Next Track
- `CTRL+SHIFT+SPACE`: Play/Pause

## Development

To run KeyTunes locally:

```bash
git clone https://github.com/FaranRaja/KeyTunes.git
cd KeyTunes
npm install
npm start
```

### Build from source
```bash
npm run dist
```
This will compile the `.exe` installer in the `dist` folder.

## License
MIT License
