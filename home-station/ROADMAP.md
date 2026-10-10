# Home Agent Station MVP Roadmap

## MVP 1 — Host runtime and GUI
- [x] Add Windows PowerShell launcher with loopback-only default.
- [x] Add standalone Node.js GUI/API bridge with loopback-only default.
- [x] Add responsive Jarvis-inspired GUI with session list, prompt composer, and settings.
- [x] Add browser STT/TTS hooks (push-to-talk only; support varies by browser).
- [ ] Run the app on Windows and fix runtime issues.
- [ ] Verify supported `opencode serve` flags and health endpoint against this exact CLI.
- [ ] Add stop/status and health-check commands and startup/sleep guidance.
- [ ] Validate every OpenCode API route and payload against the generated OpenAPI/SDK.

## MVP 2 — Reliable agent client
- [ ] List, create, resume, and send prompts using the supported OpenCode API/SDK.
- [ ] Stream assistant output and status updates live.
- [ ] Add cancel/abort support and clear busy/error/reconnect states.
- [ ] Handle workspace/directory selection if required by the API.
- [ ] Add explicit confirmation UI for sensitive actions where supported.

## MVP 3 — Phone client and voice
- [x] Create responsive PWA scaffold that can be used in a mobile browser.
- [ ] Verify installation on Android through a secure HTTPS origin.
- [ ] Add language selection, playback interruption, and robust browser compatibility handling.
- [ ] Decide whether a native React Native Android app is needed after the PWA works.
- [ ] If native, use Android Keystore/SecureStore for the connection token.

## MVP 4 — Remote access and security
- [x] Keep loopback as the default host bind.
- [x] Require `HOME_STATION_TOKEN` before non-loopback bind.
- [x] Proxy only the OpenCode API path and cap request bodies.
- [ ] Test authorization, path traversal, oversized bodies, timeouts, reconnects, and SSE behavior.
- [ ] Set up a private VPN such as Tailscale; never expose the raw OpenCode port publicly.
- [ ] Add HTTPS/reverse-proxy guidance and test browser microphone permissions on phone.

## Acceptance criteria
- The computer remains the execution host and stores working files locally.
- Model requests continue through the configured OpenCode provider.
- The GUI can create/resume sessions and send prompts reliably on the actual fork version.
- The phone can control the host only through a trusted private network and authenticated bridge.
- Voice features are optional, push-to-talk, and degrade gracefully when permissions or APIs are unavailable.
- Destructive actions remain subject to OpenCode's existing permission model.

**Testing status:** no end-to-end Windows/API test has been run yet. A checked item above means the initial scaffold was added, not that the full flow has been tested.