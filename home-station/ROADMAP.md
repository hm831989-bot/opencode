# Home Agent Station MVP Roadmap

## MVP 1 — Home computer runtime
- [x] Add Windows PowerShell launcher with loopback-only default.
- [ ] Add stop/status and health-check commands.
- [ ] Verify supported `opencode serve` flags against the checked-out version.
- [ ] Document Windows startup and sleep/power settings.

## MVP 2 — Phone client
- [ ] Create an Android app using React Native + TypeScript.
- [ ] Connect through the supported OpenCode API/SDK; do not scrape terminal output.
- [ ] List and resume sessions, send prompts, display streamed events, and cancel a running turn.
- [ ] Store connection settings securely; never embed API keys in the app.

## MVP 3 — Voice
- [ ] Speech-to-text using Android speech recognition first, with clear permission and availability handling.
- [ ] Text-to-speech using Android TTS first.
- [ ] Add push-to-talk and interrupt playback; do not continuously record by default.

## MVP 4 — Remote access and security
- [ ] Pair phone with a one-time code or equivalent authenticated setup.
- [ ] Prefer a private VPN (e.g. Tailscale) for off-home access.
- [ ] Never expose the raw OpenCode server port directly to the public internet.
- [ ] Add tests for unauthorized requests, reconnects, and server unavailable states.

## Acceptance criteria
- The computer remains the execution host and stores working files locally.
- Model requests continue through the configured OpenCode provider.
- The phone can start/resume a session and receive streamed output over an authenticated connection.
- Voice features are optional and degrade gracefully when permissions or services are unavailable.
- Destructive actions remain subject to the agent's existing permission model.