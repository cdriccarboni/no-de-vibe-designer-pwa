# No-de Vibe Designer 0.10.1 — matrice de tests

| Test | État automatisé |
|---|---|
| Racine → A → B → ×2 → retour = 6 | PASS (`nestedBoxSelfTest`) |
| Hiérarchie imbriquée après JSON | PASS |
| Boîte vide : le nombre parent traverse | PASS |
| Profondeur arrêtée à 32 | PASS |
| Connexion de types incompatibles refusée | PASS |
| Cycle sans récursion | PASS |
| Vibe : aperçu sans mutation, application, undo | PASS (unitaire + Playwright) |
| Export Max JSON | PASS |
| Export TouchDesigner compilable | PASS |
| Sauvegarde WebKit locale, sans faux téléchargement | PASS |
| OSC / Art-Net sans pont : pas de succès annoncé | PASS |
| Audio : niveau moteur ; moteur absent = erreur | PASS |
| Capteur sans API, en attente, ou avec mesure réelle | PASS |
| Protocole distant : conflit de révision | PASS |
| Canal WebSocket RFC (exemple `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` + client) | PASS |
| Zoom, pan, duplication, Preview/OUTPUT, préférences restaurées | PASS (Playwright) |
| Syntaxe Electron / mobile / pont | PASS (`npm run check`) |
| PWA : manifest, SW, hors-ligne, restauration, graphe 3×2, sous-patch, undo, Vibe, micro, caméra, MIDI, OSC, Art-Net, Serial, WebSocket, GO, zoom/pan, duplication, Preview/OUTPUT, préférences, viewports, bannière | PASS (19 tests Playwright) |
| Lancement `.app` arm64 | non relancé ici (workflow `macos-arm64.yml` inchangé) |

Les chemins matériels (MIDI physique, Serial, OSC/Art-Net live, capteurs, installation sur téléphone) restent des erreurs explicites tant qu’ils ne sont pas branchés. Ils ne sont pas simulés.
