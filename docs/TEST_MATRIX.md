# No-de Vibe Designer 0.9.4 — critical test matrix

Canonical tree. The 0.8.0 acceptance cases that this line did not already cover are ported here; camera → shader, vibe preview, and audio stay on the 0.9.x engine.

| Test | Automated state |
|---|---|
| Root → A → B → ×2 → B → A → root returns 6 | PASS (`nestedBoxSelfTest`) |
| Nested hierarchy survives JSON round-trip | PASS |
| Nested box restores parent input after a child box | PASS |
| Subpatch depth stops at 32 | PASS |
| Empty box passes a parent number through | PASS |
| Typed incompatible connection rejected | PASS |
| Cyclic graph does not recurse/crash | PASS |
| Vibe preview does not mutate; apply creates the graph | PASS |
| Max/MSP export JSON structure parses | PASS |
| TouchDesigner Python export compiles | PASS |
| WebKit manual save uses localStorage, not a fake download | PASS |
| OSC / Art-Net without a bridge does not claim success | PASS |
| Audio node publishes the engine level; missing engine is an error | PASS |
| Electron source syntax check | PASS (`npm run check`) |
| Packaged macOS arm64 cold launch + nested-box smoke | CI `.github/workflows/macos-arm64.yml` (`--smoke-test`) |

Hardware paths (camera, MIDI, serial, a live OSC/Art-Net bridge) still report a real failure instead of a simulated success.
