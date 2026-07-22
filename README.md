# KeyTunes

A lightweight background app: custom hotkeys to control Spotify from anywhere (games, full-screen apps, your IDE), plus a small tray-triggered mini player.

**No account linking, no OAuth, no Spotify Developer app, no Premium requirement — for you or anyone using this.** It talks directly to the local Spotify desktop app through Windows' own media session system (the same one your keyboard's media keys already use), instead of going through Spotify's Web API.

## Why this shouldn't break on Spotify updates

Older tools like Toastify sometimes broke on Spotify client updates because they hooked into window titles or internal client details directly. This app instead uses Windows' System Media Transport Controls (SMTC) — the OS-level "now playing" registry that any media app, including Spotify, plugs into. That interface is part of Windows, not Spotify, so it's stable across Spotify client updates.

## Requirements

- **Windows 10 or 11** (this relies on Windows-only APIs — SMTC and simulated media keys — so it won't work on macOS/Linux)
- **Node.js** v18+
- The Spotify desktop app, any account tier (Free or Premium both work)

## Setup

```bash
npm install
npm start
```

That's it — no accounts to link, no API keys to generate. The settings window opens automatically showing your hotkeys and a live "Spotify detected" status once Spotify is open and playing something.

## Hotkeys

Click any key-combo chip in the settings window and press your new combo to rebind it (`Escape` cancels). Bindings save and re-register instantly.

Defaults:

| Action | Default |
|---|---|
| Play/Pause | `Ctrl+Alt+Space` |
| Next track | `Ctrl+Alt+Right` |
| Previous track | `Ctrl+Alt+Left` |
| Volume up | `Ctrl+Alt+Up` |
| Volume down | `Ctrl+Alt+Down` |
| Toggle mini player | `Ctrl+Alt+S` |

**Note on volume:** Volume hotkeys directly adjust Spotify's volume level in the Windows Volume Mixer using the Core Audio API, so they never mess with your overall system volume!

Closing the settings window doesn't quit the app — it keeps running in the tray. Right-click the tray icon → **Quit** to fully exit. Click the tray icon (or its hotkey) to pop up the mini player near the bottom-right, showing the current track with play/pause, skip, and volume controls.

## Packaging as a standalone .exe

```bash
npm run dist
```

Uses `electron-builder` (see the `build` config in `package.json`) to produce an installer in `dist/`. Swap `assets/icon.png` for a proper multi-resolution `.ico` for the best result on Windows.

## Project structure

```
main.js                 Electron main process: windows, tray, IPC, hotkey wiring
preload.js               Safe IPC bridge exposed to renderer windows
scripts/
  spotify-control.ps1     PowerShell script: talks to Windows SMTC + simulates volume keys
src/
  store.js                 JSON config persistence (userData/config.json) - just hotkeys now
  mediaControl.js            Node wrapper that shells out to the PowerShell script
  hotkeys.js                  Registers/unregisters global OS hotkeys
renderer/
  settings/                    Main hotkeys/settings window (the visible UI)
  miniplayer/                   Small floating now-playing card shown near the tray
```

## How the PowerShell control script works

`scripts/spotify-control.ps1` does two separate things depending on the action:

- **Play/Pause/Next/Previous/Status** — uses the `Windows.Media.Control` WinRT API to find Spotify's registered media session and send commands to it directly, and to read back the current title/artist/playback state. This is the same system Windows uses to show Spotify in your taskbar's media flyout.
- **VolumeUp/VolumeDown** — Uses the Windows Core Audio API (`ISimpleAudioVolume`) via a C# COM wrapper to find Spotify's process in the Volume Mixer and adjust its individual volume independently of the master system volume.

If this doesn't work as expected on your machine (older Windows builds can lack full SMTC support), the most useful things to send me are: your Windows version, and the raw output of running the script manually:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\spotify-control.ps1 -Action Status
```

## Known limitations

- Windows-only.
- If multiple media apps are open, the script matches sessions by `SourceAppUserModelId` containing "Spotify" — if you have something else with Spotify in its app ID, this could theoretically pick the wrong session, though this is rare in practice.
