# Companion Studio

Date: 2026-09-29 · Branch `cursor/no-de-2.2-reprise-20260929` · App **1.1.0**

## Goal

Phone/tablet as a customizable show-control surface: connect → customize → test → send → disconnect → play.
Local First · LAN priority · Action / Binding / Presentation separated.

## Audit (consolidate)

| Existing | Role | Reuse |
|---|---|---|
| `companion/` + PeerJS Remote Camera | Camera only | Keep separate — not a control surface |
| `bridge/remote-server.mjs` WS :4174 | Project sync host/remote | **Extended** for `companion` role + `studio-*` relay |
| Desktop Control Surface (channels) | Patch-exposed sliders | Complementary; Studio layouts are freer |
| Ultimate `shared/companion/*` (checkpoint) | Camera/WebRTC/sensors | Reference only — not reintroduced as competing stack |
| ART Intercom / profile-sync | PeerJS media + QR | Camera path; Studio uses WS first |

## Architecture

```
shared/companion-studio/
  schema.js       .nodecompanion (nvd.companion v1)
  protocol.js     studio-hello/action/feedback/layout/ping
  transport.js    USB→LAN→WebRTC→WS abstraction
  transport-ws.js WS impl (LAN / localhost)
  store.js        localStorage + export
  bindings.js     Action/Binding apply on host
  widgets.js      catalog (P0 button/momentary + P1 list)
  detect.js       desktop detect preferences
studio/           Companion Studio UI (Édition / Test / Plateau)
```

## Run

```bash
npm run remote:bridge          # WS :4174
npm run serve:companion        # Camera / + Studio at /studio/
# Desktop with host: open desktop/?companionHost=1 (or Electron)
# Phone: http://<lan>:4177/studio/ → Connect ws://<lan>:4174
```

## What works (proven in tests / local code)

- Schema validate/export/local save-load
- Seed layout with GO + PING buttons
- Bidirectional ping binding → feedback with measured rttMs (≥0, not invented absent)
- USB/WebRTC transports report PLATFORM-LIMITED honestly
- Detect banner actions (Open Studio / Sync / Monitor / Controller / Ignore)
- Bridge relays studio messages host ↔ companion

## Not Done / PLATFORM-LIMITED

- Physical Mac↔phone button field proof
- Live layout sync Desktop↔device editor (Sync sends layout; full live edit sync P1)
- Use as Monitor (P2)
- USB WebUSB, WebRTC datachannel Studio
- Full widget set editing (fader/XY/VU/…) — catalog listed, UI P0 = buttons
- Multi-companion roles / Drive compare
- Measured LAN RTT on real Wi-Fi (protocol ready; hardware proof pending)

Do **not** claim Companion Studio product Done until hardware scenarios 1–2 pass.
