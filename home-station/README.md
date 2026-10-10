# OpenCode Home Agent Station

Home Agent Station is an optional, self-hosted control layer around OpenCode. The Windows computer stores project files and runs terminal tools; model inference remains with whichever provider is already configured in OpenCode. This project does not add a local LLM.

## Current implementation

- Responsive Jarvis-inspired GUI with animated plasma orb, session sidebar, prompt box, and quick actions.
- Browser speech-to-text when the browser supports the Web Speech API, activated only by pressing Talk.
- Optional spoken replies using the device's built-in speech synthesis.
- Small Node.js bridge that serves the GUI and proxies requests to the OpenCode server.
- Windows PowerShell launcher for OpenCode plus the GUI bridge.
- Installable web-app manifest scaffold for a phone-sized interface.

**Status: early scaffold, not yet tested end-to-end.** The API paths and payloads must be checked against this fork's actual OpenCode API before treating the app as usable. It is not a native Android APK yet. Read [HANDOFF.md](HANDOFF.md) for the exact next steps and a prompt for coding agents.

## Windows local start

Requirements: the OpenCode CLI already installed and configured, plus Node.js 20 or newer.

From PowerShell in a checkout of this branch:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\home-station\windows\Start-HomeStation-GUI.ps1
```

The launcher starts OpenCode on `127.0.0.1:4096` and the GUI bridge on `127.0.0.1:8787`. Open `http://127.0.0.1:8787` in the browser. If you already run OpenCode on port 4096, the launcher attempts to reuse it. Logs are written under `%LOCALAPPDATA%\OpenCodeHomeStation\logs`.

## Phone / remote access

Loopback is the default. Do not expose the OpenCode server port directly. Remote binding is blocked unless `HOME_STATION_TOKEN` is set, but that token alone is not a replacement for a private network. Use a trusted VPN such as Tailscale and keep the bridge private. For browser microphone access and service-worker/PWA installation on a phone, configure a secure HTTPS origin; plain HTTP on a LAN IP may not provide those browser features.

Example PowerShell setup for a private-network bind (only do this on a trusted private VPN/LAN and after reviewing your firewall):

```powershell
$env:HOME_STATION_TOKEN = [guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
.\home-station\windows\Start-HomeStation-GUI.ps1 -StationHost "0.0.0.0"
```

Enter that token in the GUI's Connection & voice settings. Do not paste your model-provider API key here. Do not port-forward the bridge or OpenCode API on your router.

## Security notes

An agent with terminal access can modify/delete files and execute commands as the Windows user running it. Use a dedicated non-admin account where possible, limit the working directory and OpenCode permissions, and review destructive or privileged actions. The bridge is intentionally narrow, has a request-size cap, and does not allow the browser to choose an arbitrary upstream URL.

## Next

See [ROADMAP.md](ROADMAP.md) for milestones and [HANDOFF.md](HANDOFF.md) for the agent handoff. API compatibility, live streaming, cancellation, remote HTTPS, automated tests, and the native Android decision remain open work.
