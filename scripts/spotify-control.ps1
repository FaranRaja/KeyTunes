param(
    [Parameter(Mandatory = $false)]
    [string]$Action
)

$ErrorActionPreference = 'Stop'

# ---------- WinRT bootstrapping ----------

[System.Reflection.Assembly]::LoadWithPartialName("System.Runtime.WindowsRuntime") | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null

Function Await($WinRtTask, $ResultType) {
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and
        $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $task = $asTask.Invoke($null, @($WinRtTask))
    $task.Wait(-1) | Out-Null
    return $task.Result
}

function Get-SpotifySession {
    $managerTask = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
    $manager = Await $managerTask ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    $sessions = $manager.GetSessions()
    foreach ($s in $sessions) {
        if ($s.SourceAppUserModelId -match 'Spotify') { return $s }
    }
    return $null
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;

namespace Audio {
    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumerator { }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr ppDevices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionManager2 {
        [PreserveSig] int GetAudioSessionControl(ref Guid AudioSessionGuid, uint StreamFlags, out IntPtr SessionControl);
        [PreserveSig] int GetSimpleAudioVolume(ref Guid AudioSessionGuid, uint StreamFlags, out ISimpleAudioVolume AudioVolume);
        [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    }

    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionEnumerator {
        [PreserveSig] int GetCount(out int SessionCount);
        [PreserveSig] int GetSession(int SessionCount, out IAudioSessionControl Session);
    }

    [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl { }

    [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioSessionControl2 {
        [PreserveSig] int GetState(out int state);
        [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string retVal);
        [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string retVal);
        [PreserveSig] int GetProcessId(out uint retVal);
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface ISimpleAudioVolume {
        [PreserveSig] int SetMasterVolume(float fLevel, IntPtr EventContext);
        [PreserveSig] int GetMasterVolume(out float pfLevel);
    }

    public class VolumeHelper {
        public static void AdjustAppVolume(string processName, float delta) {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                if (enumerator == null) return;
                IMMDevice device;
                enumerator.GetDefaultAudioEndpoint(0, 1, out device);
                if (device == null) return;
                Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object managerObj;
                device.Activate(ref IID_IAudioSessionManager2, 1, IntPtr.Zero, out managerObj);
                if (managerObj == null) return;
                IAudioSessionManager2 manager = (IAudioSessionManager2)managerObj;
                IAudioSessionEnumerator sessionEnumerator;
                manager.GetSessionEnumerator(out sessionEnumerator);
                if (sessionEnumerator == null) return;
                int count;
                sessionEnumerator.GetCount(out count);
                for (int i = 0; i < count; i++) {
                    IAudioSessionControl control;
                    sessionEnumerator.GetSession(i, out control);
                    IAudioSessionControl2 control2 = control as IAudioSessionControl2;
                    if (control2 != null) {
                        try {
                            string id;
                            control2.GetSessionIdentifier(out id);
                            if (!string.IsNullOrEmpty(id) && id.IndexOf(processName, StringComparison.OrdinalIgnoreCase) >= 0) {
                                ISimpleAudioVolume volume = control as ISimpleAudioVolume;
                                if (volume != null) {
                                    float current;
                                    volume.GetMasterVolume(out current);
                                    float newVal = current + delta;
                                    if (newVal > 1.0f) newVal = 1.0f;
                                    if (newVal < 0.0f) newVal = 0.0f;
                                    volume.SetMasterVolume(newVal, IntPtr.Zero);
                                }
                            }
                        } catch { }
                    }
                }
            } catch { }
        }

        public static void SetAppVolume(string processName, float newVal) {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                if (enumerator == null) return;
                IMMDevice device;
                enumerator.GetDefaultAudioEndpoint(0, 1, out device);
                if (device == null) return;
                Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object managerObj;
                device.Activate(ref IID_IAudioSessionManager2, 1, IntPtr.Zero, out managerObj);
                if (managerObj == null) return;
                IAudioSessionManager2 manager = (IAudioSessionManager2)managerObj;
                IAudioSessionEnumerator sessionEnumerator;
                manager.GetSessionEnumerator(out sessionEnumerator);
                if (sessionEnumerator == null) return;
                int count;
                sessionEnumerator.GetCount(out count);
                for (int i = 0; i < count; i++) {
                    IAudioSessionControl control;
                    sessionEnumerator.GetSession(i, out control);
                    IAudioSessionControl2 control2 = control as IAudioSessionControl2;
                    if (control2 != null) {
                        try {
                            string id;
                            control2.GetSessionIdentifier(out id);
                            if (!string.IsNullOrEmpty(id) && id.IndexOf(processName, StringComparison.OrdinalIgnoreCase) >= 0) {
                                ISimpleAudioVolume volume = control as ISimpleAudioVolume;
                                if (volume != null) {
                                    if (newVal > 1.0f) newVal = 1.0f;
                                    if (newVal < 0.0f) newVal = 0.0f;
                                    volume.SetMasterVolume(newVal, IntPtr.Zero);
                                }
                            }
                        } catch { }
                    }
                }
            } catch { }
        }

        public static float GetAppVolume(string processName) {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                if (enumerator == null) return -1f;
                IMMDevice device;
                enumerator.GetDefaultAudioEndpoint(0, 1, out device);
                if (device == null) return -1f;
                Guid IID_IAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object managerObj;
                device.Activate(ref IID_IAudioSessionManager2, 1, IntPtr.Zero, out managerObj);
                if (managerObj == null) return -1f;
                IAudioSessionManager2 manager = (IAudioSessionManager2)managerObj;
                IAudioSessionEnumerator sessionEnumerator;
                manager.GetSessionEnumerator(out sessionEnumerator);
                if (sessionEnumerator == null) return -1f;
                int count;
                sessionEnumerator.GetCount(out count);
                for (int i = 0; i < count; i++) {
                    IAudioSessionControl control;
                    sessionEnumerator.GetSession(i, out control);
                    IAudioSessionControl2 control2 = control as IAudioSessionControl2;
                    if (control2 != null) {
                        try {
                            string id;
                            control2.GetSessionIdentifier(out id);
                            if (!string.IsNullOrEmpty(id) && id.IndexOf(processName, StringComparison.OrdinalIgnoreCase) >= 0) {
                                ISimpleAudioVolume volume = control as ISimpleAudioVolume;
                                if (volume != null) {
                                    float current;
                                    volume.GetMasterVolume(out current);
                                    return current;
                                }
                            }
                        } catch { }
                    }
                }
            } catch { }
            return -1f;
        }
    }
}
"@ -ErrorAction SilentlyContinue

# ---------- Actions ----------

function Run-Action {
    param([string]$act)
    if ($act.StartsWith('SetVolume ')) {
        $val = [float]$act.Substring(10)
        [Audio.VolumeHelper]::SetAppVolume("Spotify", $val)
        return
    }

    switch ($act) {
        'Status' {
            $session = Get-SpotifySession
            if (-not $session) {
                Write-Output (@{ active = $false } | ConvertTo-Json -Compress)
                return
            }
            try {
                $props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                $playback = $session.GetPlaybackInfo()
                $timeline = $session.GetTimelineProperties()
                $isPlaying = $playback.PlaybackStatus -eq [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionPlaybackStatus]::Playing
                $vol = [Audio.VolumeHelper]::GetAppVolume("Spotify")

                $thumbBase64 = $null
                if ($props.Thumbnail) {
                    try {
                        $streamWithContentType = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
                        $method = [System.IO.WindowsRuntimeStreamExtensions].GetMethod("AsStreamForRead", [type[]]@([Windows.Storage.Streams.IInputStream]))
                        $dotNetStream = $method.Invoke($null, @($streamWithContentType))
                        $memoryStream = New-Object System.IO.MemoryStream
                        $dotNetStream.CopyTo($memoryStream)
                        $thumbBase64 = [Convert]::ToBase64String($memoryStream.ToArray())
                    } catch {}
                }

                $result = [ordered]@{
                    active     = $true
                    title      = $props.Title
                    artist     = $props.Artist
                    isPlaying  = $isPlaying
                    positionMs = [math]::Round($timeline.Position.TotalMilliseconds)
                    durationMs = [math]::Round($timeline.EndTime.TotalMilliseconds)
                    volume     = $vol
                    thumbnail  = $thumbBase64
                }
                Write-Output ($result | ConvertTo-Json -Compress)
            } catch {
                Write-Output (@{ active = $false } | ConvertTo-Json -Compress)
            }
        }
        'PlayPause' {
            $session = Get-SpotifySession
            if ($session) { Await ($session.TryTogglePlayPauseAsync()) ([bool]) | Out-Null }
        }
        'Next' {
            $session = Get-SpotifySession
            if ($session) { Await ($session.TrySkipNextAsync()) ([bool]) | Out-Null }
        }
        'Previous' {
            $session = Get-SpotifySession
            if ($session) { Await ($session.TrySkipPreviousAsync()) ([bool]) | Out-Null }
        }
        'VolumeUp' {
            [Audio.VolumeHelper]::AdjustAppVolume("Spotify", 0.02)
        }
        'VolumeDown' {
            [Audio.VolumeHelper]::AdjustAppVolume("Spotify", -0.02)
        }
    }
}

if ($Action) {
    Run-Action $Action
} else {
    while ($line = [Console]::ReadLine()) {
        if ($line -eq 'exit') { break }
        Run-Action $line
    }
}
