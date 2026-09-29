# No-de Vibe Designer System Test — 0.10.1

Statuts : **vérifié**, **partiel**, **bloqué**, **non testé**.  
Preuves de cette passe : `npm test` → **86 OK, 0 FAIL** ; `npx playwright test -c playwright.config.mjs` → **19 passed** ; `npm run check` sans erreur.  
La CI GitHub Actions n’a pas été utilisée (dépôts privés). Tout a été lancé dans la VM.

| Fonction | Statut | Preuve |
|---|---|---|
| Moteur de graphe, types, cycles, caméra→shader | vérifié | `npm test` (ports, edges, cycles, evaluate) |
| Nombre × multiplication = 6 | vérifié | test unitaire + Playwright « number times multiply » (`Multiplication.2=6`) |
| Sous-patch et boîtes imbriquées (valeur 6, profondeur 32) | vérifié | `nestedBoxSelfTest` + Playwright « subpatch keeps an inner node » |
| Undo / Redo | vérifié | tests unitaires history + Playwright |
| Vibe aperçu, annulation, application, undo | vérifié | tests unitaires + Playwright (le graphe reste vide tant que l’aperçu n’est pas appliqué) |
| Exports Max/MSP et TouchDesigner | vérifié | JSON analysé, Python compilé (`npm test`) |
| Exclusion Grok / xAI | vérifié | `npm test` ai-policy |
| Sauvegarde et réouverture PWA | vérifié | Playwright : nom « Projet Persisté », alerte « Projet restauré », IndexedDB du même contexte |
| Manifest, icônes, service worker, nom « No-de Vibe Designer » | vérifié | Playwright : `display: standalone`, icônes 192/512 et maskable, `SKIP_WAITING` |
| Mode standalone réel (écran d’accueil) | partiel | le manifest le déclare ; `matchMedia('(display-mode: standalone)')` est **faux** dans un onglet. Installation Pixel/tablette : **à valider sur matériel** |
| Hors-ligne (coque locale) | vérifié | Playwright : contrôleur SW, `setOffline`, rechargement, titre toujours présent |
| Mise à jour sans rechargement silencieux | vérifié | Playwright : bannière « Nouvelle version », le nom du projet reste « Patch en cours » |
| Création de projet, nodes, connexions | vérifié | Playwright (nouveau projet, trois nodes, deux câbles) |
| Cue et GO plateau | vérifié | Playwright « cue GO reaches the plateau » → `GO TOP 1` |
| Zoom / pan / duplication (UI mobile) | vérifié | Playwright « zoom and pan move the patch » et « duplicate keeps a second node » |
| Micro refusé | vérifié | Playwright, permission mockée `NotAllowedError`, alerte « Micro » |
| Caméra refusée | vérifié | Playwright, alerte « Caméra » |
| MIDI absent | vérifié | Playwright, alerte « MIDI ». Aucun périphérique branché : **à valider sur matériel** |
| OSC sans passerelle | vérifié | Playwright, texte « OSC indisponible » |
| Art-Net sans pont | vérifié | alerte « Art-Net » + test unitaire (pas d’envoi annoncé) |
| Serial absent | vérifié | alerte « Serial » sur Chromium sans Web Serial. Port série réel : **à valider sur matériel** |
| Erreur réseau WebSocket (port refusé) | vérifié | Playwright, statut erreur / perte / réseau |
| Reconnexion WebSocket, perte réseau et conflit / push | vérifié | Playwright sans `NVD_WS_GUID` : connexion, perte, reconnexion, conflit, `GET /health` révision 1. Accept RFC : clé d’exemple → `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` (`npm test`). Réseau réel hors localhost : **à valider sur matériel** |
| Hôte Electron du pont | partiel | `electron/main.cjs` démarre le pont sans bloquer l’app. Fenêtre Electron et `.app` non lancés ici |
| Capteurs (gyro, accelero, orientation, GPS, Bluetooth, vibration) | partiel | unitaire : API absente, attente sans chiffre inventé, alpha 1,5 si une mesure est fournie. Aucun capteur physique dans la VM : **à valider sur matériel** |
| Réseau / Wi-Fi | partiel | `navigator.onLine` réel. Pas de SSID en Web : message explicite, pas de nom inventé |
| Tactile / multitouch | partiel | le pad appelle `noteTouch` et crée un node. Pas de geste multitouch automatisé |
| Preview / OUTPUT | vérifié | Playwright : canvas visible, PLAY, puis statut ou alerte OUTPUT |
| Préférences (couleurs, IA) | vérifié | Playwright : couleur et endpoint enregistrés, restaurés après fermeture. Grok toujours refusé par le moteur |
| Desktop 0.9.4 (moteur inchangé dans ses tests) | vérifié | les 84 tests incluent l’ancien socle. Smoke Electron `--smoke-test` : **non testé** dans cette VM (pas de session graphique Electron) |
| Installation PWA sur Pixel ou tablette | non testé | captures viewport seulement (390×844, 844×390, 768×1024, 1024×768) |
| OSC / Art-Net sur un réseau réel | non testé | **à valider sur matériel** |
| Remote desktop sur un vrai réseau local | non testé | **à valider sur matériel** |

Captures : `/opt/cursor/artifacts/screenshots/` (portrait et paysage, téléphone et tablette, Bureau et Plateau).
