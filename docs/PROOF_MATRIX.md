# Matrice de preuves — No-de Vibe Designer 0.10.1

Détail et statuts : `docs/SYSTEM_TEST.md`.

| Fonction | Statut | Preuve |
|---|---|---|
| Patch, types, cycles | vérifié | `npm test` |
| Nombre × multiplication | vérifié | unitaire + Playwright |
| Sous-patch / boîtes imbriquées | vérifié | valeur 6, Playwright |
| Vibe aperçu / appliquer / undo | vérifié | le preview ne mute pas |
| PWA manifest + SW + hors-ligne + mise à jour | vérifié | 19 tests Playwright |
| Sauvegarde IndexedDB | vérifié | fermeture / réouverture du contexte |
| Cue GO | vérifié | Playwright |
| OSC / Art-Net sans pont | vérifié | erreur visible, pas d’envoi |
| MIDI / Serial / micro / caméra absents | vérifié | message explicite. Matériel : à valider |
| Canal WebSocket RFC, y compris Chrome | vérifié | exemple RFC `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` + Playwright sans `NVD_WS_GUID` |
| Hôte desktop distant | partiel | code Electron, pas de fenêtre lancée |
| Capteurs physiques, Pixel, réseau OSC réel | non testé | à valider sur matériel |
| `.app` macOS | non testé | non reconstruit dans cette passe |
