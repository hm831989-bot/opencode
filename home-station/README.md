# OpenCode Home Agent Station

Home Agent Station is a self-hosted control layer around OpenCode. The home computer stores project files and runs terminal tools; model inference remains with whichever remote provider the user configures in OpenCode. This project does not add a local LLM.

## Design goals

- Reuse OpenCode's existing server/API and session model instead of reimplementing the agent.
- Keep files, terminal execution, and credentials on the home computer.
- Add a phone-friendly client for chat, session selection, voice input (STT), and spoken responses (TTS).
- Keep the server private by default. Do not expose the OpenCode API directly to the public internet.
- Preserve the upstream CLI and TUI; Home Agent Station is an optional layer.

## Current status

This directory is an initial scaffold, not a finished Android app. The first milestone is a safe Windows launcher and documented architecture. Android UI, voice features, authenticated pairing, and remote access must be implemented and tested in later commits.

## Local development

1. Install and configure OpenCode normally.
2. Review `windows/Start-HomeStation.ps1`.
3. Start the server on loopback first; verify the API locally.
4. For phone access, use a private VPN such as Tailscale or an equivalent authenticated private network. Do not forward the server port directly on your router.
5. Before using this with important files, review OpenCode permissions and require confirmation for destructive or privileged actions.

## Planned milestones

1. **Host runtime:** start/stop/status scripts, logs, and startup guidance for Windows.
2. **Phone API client:** typed API client using the supported OpenCode SDK/API, session list and messaging, event stream.
3. **Android app:** chat, session history, connection status, voice input/output, and explicit confirmation for sensitive actions.
4. **Hardening:** pairing, token storage, network restrictions, reconnect handling, and tests.

## Important security note

An agent with terminal access can modify or delete files and execute commands as the Windows user running it. Run it as a dedicated, non-admin account where possible, limit its working directories, and do not make the API publicly reachable.