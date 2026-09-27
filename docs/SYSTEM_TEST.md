# Matrice System Test — No-de Vibe Designer 0.9.0

| ID | Chaîne | Type | Résultat | Notes |
|---|---|---|---|---|
| T01 | ports + types | logiciel | OK | `node tests/run.mjs` |
| T02 | validateEdge compatible/incompatible | logiciel | OK | |
| T03 | cycles / feedback sans blocage | logiciel | OK | |
| T04 | evaluateGraph camera→shader | logiciel | OK | stubs |
| T05 | vibe local → ops + edges | logiciel | OK | |
| T06 | round-trip `.cvd.json` | logiciel | OK | |
| T07 | smoke HTTP desktop | logiciel | à lancer | `./LANCER-…` |
| T08 | caméra → Preview | matériel | **à vérifier** | permission macOS |
| T09 | MIDI hardware → CC → shader | matériel | **à vérifier** | `midi connect` |
| T10 | Serial hardware | matériel | **à vérifier** | `serial connect` |
| T11 | OSC via WebSocket bridge | matériel/réseau | **à vérifier** | bridge externe requis |
| T12 | save → close → restore | logiciel | OK (autosave + export) | recharger UI |
| T13 | build `.app` | logiciel | OK | `BUILD-No-de-Vibe-Designer-app.command` |
| T14 | IA distante | config | **à vérifier** | endpoint dans Préférences |

Légende : **à vérifier** = non exercé sur périphérique réel dans cette passe.
