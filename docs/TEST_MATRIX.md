# No-de Vibe Designer 0.8.0 — critical test matrix

| Test | Automated state |
|---|---|
| Root → A → B → processing → B → A → root | PASS |
| Recursive hierarchy survives serialize/deserialize | PASS |
| Typed incompatible connection rejected | PASS |
| Cyclic graph does not recurse/crash | PASS |
| Vibe “un trou noir qui tourne” creates real graph | PASS |
| Second Vibe instruction modifies existing graph | PASS |
| Manual nodes can be wrapped into subpatch | PASS |
| Max/MSP export JSON structure parses | PASS |
| TouchDesigner Python export compiles | PASS |
| Legacy flat graph migrates to Graph IR v2 | PASS |
| Electron source syntax check | PASS |
| Packaged macOS cold launch | PENDING macOS CI / physical Mac |

Hardware-dependent paths (camera, MIDI, Serial, external OSC/Art-Net targets) report real connection errors rather than simulated success.
