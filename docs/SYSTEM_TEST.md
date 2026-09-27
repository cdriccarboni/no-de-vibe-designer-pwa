# Matrice System Test — No-de Vibe Designer 0.9.1

| ID | Chaîne | Type | Résultat | Notes |
|---|---|---|---|---|
| T01 | ports + types | logiciel | OK | `node tests/run.mjs` |
| T02 | validateEdge compatible/incompatible | logiciel | OK | |
| T03 | cycles / feedback sans blocage | logiciel | OK | |
| T04 | evaluateGraph camera→shader | logiciel | OK | stubs |
| T05 | vibe local → ops + edges | logiciel | OK | |
| T06 | round-trip `.cvd.json` | logiciel | OK | |
| T07 | smoke HTTP desktop | logiciel | OK | 200 sur /desktop/ |
| T08 | caméra → Preview | matériel | **à vérifier** | permission macOS |
| T09 | MIDI hardware → CC → shader | matériel | **à vérifier** | `midi connect` |
| T10 | Serial hardware | matériel | **à vérifier** | `serial connect` |
| T11 | OSC via WebSocket bridge | matériel/réseau | **à vérifier** | bridge externe requis |
| T12 | save → close → restore | logiciel | OK (autosave + export) | |
| T13 | build `.app` | logiciel | OK | `BUILD-No-de-Vibe-Designer-app.command` |
| T14 | IA distante | config | **à vérifier** | endpoint OpenAI-compatible |
| T15 | exclusion Grok/xAI | logiciel | OK | refus explicite |
| T16 | undo/redo historique | logiciel | OK | |
| T17 | zoom/pan / duplicate | logiciel | OK (UI) | smoke manuel recommandé |

Légende : **à vérifier** = non exercé sur périphérique réel dans cette passe.

## Note dépôt distant

`origin/main` (GitHub) suit une histoire **sans ancêtre commun** (app Electron `app/` affichée 0.8.0).  
La ligne de production P00/P01 actuelle est `cursor/no-de-finalisation-20260927` / arbre `desktop/`+`shared/` **0.9.1**.  
Ne pas fusionner les deux historiques sans décision explicite.
