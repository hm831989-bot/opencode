# Home Agent Station — Agent Handoff

## Mission

Continue building a practical Jarvis-style control station on branch \`feat/home-agent-station\` in \`hm831989-bot/opencode\`.

This is an optional control layer around OpenCode, not a replacement agent runtime:
- The Windows laptop is the execution host. It owns project files and runs approved terminal/file tools.
- Model inference stays with the provider already configured in OpenCode. Do not add or assume a local LLM.
- The user wants a polished GUI, voice I/O, and an Android-friendly way to control the host remotely.

## Work committed on this branch

- \`home-station/README.md\`: architecture, constraints, safety notes.
- \`home-station/ROADMAP.md\`: milestones and acceptance criteria.
- \`home-station/windows/Start-HomeStation.ps1\`: original loopback launcher scaffold.
- \`home-station/server.mjs\`: small Node HTTP bridge; serves the GUI and proxies \`/api/opencode/*\` to the local OpenCode server.
- \`home-station/app/index.html\`, \`app.css\`, \`app.js\`: responsive Jarvis-inspired web GUI with animated plasma orb, session sidebar, prompt composer, quick actions, browser speech recognition, browser TTS, and settings.
- \`home-station/app/manifest.webmanifest\`, \`app/service-worker.js\`: installable-web-app scaffold.
- \`home-station/windows/Start-HomeStation-GUI.ps1\`: Windows launcher for \`opencode serve\` plus the bridge.
- This handoff document.

## Honest status

Files have been committed through GitHub file operations, but have NOT been run or type-checked in a real Windows environment. Do not tell the user they are tested or production-ready.

The GUI is a responsive web app/PWA scaffold, not a native React Native Android APK. It can be opened in a browser and is intended to be installable on Android after the secure-origin/service-worker setup is completed. Browser speech recognition varies by browser, language, and platform.

The OpenCode API integration is best-effort and MUST be verified against this fork's exact version. In particular verify:
- \`GET /session\`
- \`POST /session\` with \`{ title }\`
- \`GET /session/{id}/message\`
- \`POST /session/{id}/message\` with \`{ parts: [{ type: "text", text }] }\`
- \`GET /global/event\` streaming behavior
- whether the API expects a directory/workspace query parameter and how errors are shaped.

Do not silently fake success if API shapes differ. Update the adapter based on this repository's actual OpenAPI definitions or SDK.

## Next tasks, in order

1. **Run locally.** Check out this branch. Use the repository's Bun workflow for OpenCode itself. The standalone bridge needs Node.js 20+ and no npm dependencies.
2. **Validate the launcher.** Check \`opencode serve --help\` for this exact CLI. Verify the health endpoint path and fix Windows log redirection if redirecting stdout and stderr to the same file fails on the target PowerShell version.
3. **Validate OpenCode API.** Inspect \`packages/opencode/src/server/routes/instance/httpapi\`, the generated OpenAPI document, and/or \`@opencode-ai/sdk\`. Implement exact endpoint schemas and event parsing. Test create/list/resume/send/cancel. The current GUI refreshes the transcript after a blocking prompt; implement true live streaming using the exact event/message-part schema.
4. **Security.** Loopback must remain the default. Remote bind must require a long random \`HOME_STATION_TOKEN\`. Test token enforcement, path traversal, request size caps, timeouts, reconnects, and SSE streaming. Prefer Tailscale or another private VPN; never expose the raw OpenCode port or this bridge to the public internet. Consider HTTPS/reverse-proxy support because microphone permissions and service workers usually require a secure context on mobile.
5. **Voice UX.** Keep push-to-talk only; no continuous recording. Add interrupt playback, speech-language selection, graceful unsupported-browser messages, and request microphone permission only after the user taps the microphone.
6. **Mobile client.** First make the PWA usable and installable, then decide whether a native React Native app is needed. If native is built, keep token storage in Android Keystore/SecureStore and reuse the same narrow API. Do not store provider API keys on the phone.
7. **Product polish.** Add a working stop/cancel control, connection diagnostics, model/workspace selection if supported, event-based live status, responsive keyboard handling, and a clear permission/action confirmation surface.
8. **Tests and docs.** Add automated tests for bridge authorization and API proxying; run lint/typecheck/tests available in the repository; document exact Windows setup, phone setup, and known limitations. Update README and roadmap checkboxes only after tests actually pass.

## Architecture

Android/Windows browser UI -> Home Station bridge (port 8787) -> OpenCode server (loopback port 4096) -> configured remote model provider.

Only the bridge should be reachable from the phone, and only on a trusted private network with a token. Keep the OpenCode server bound to loopback. The GUI must not accept arbitrary upstream URLs from untrusted callers.

## Suggested prompt for a coding agent

Work only on branch \`feat/home-agent-station\` in \`hm831989-bot/opencode\`. Read \`home-station/HANDOFF.md\`, \`README.md\`, and \`ROADMAP.md\` first. Inspect the actual OpenCode HTTP API and SDK in this checkout before changing the GUI integration. Run the bridge and GUI, correct API schemas and PowerShell issues, then add tests for local-only default, mandatory token on remote bind, unauthorized proxy rejection, path traversal, and OpenCode unavailable behavior. Do not claim tests passed unless you ran them. Preserve remote-provider inference and loopback-only OpenCode server. Keep changes scoped to \`home-station/\` unless a necessary SDK/API integration requires otherwise.