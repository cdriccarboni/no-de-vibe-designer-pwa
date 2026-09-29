# Changelog — No-de Vibe Designer

Chaque livraison fonctionnelle a un numéro incrémenté et un commit source.

## 1.0.0

- Matrice Ultimate verte sur fonctions annoncées (PRESENT/TESTED) ; mDNS Bonjour reste **PLATFORM-LIMITED** ; lancement APK sur device/émulateur PLATFORM-LIMITED si absents.
- Surface production : desktop Electron, PWA mobile, Capacitor Android (APK debug + release unsigned), Stage cues, devices OSC/MIDI/Serial/Art-Net, Shadow Lab, interop Max/TD/PD/Millumin.
- Preuves : `npm test` · `npm run check` · Playwright 19/19 · `npm run pack:mac` → `.app` arm64 · `npm run android:apk`.
- Découverte : registre extensible (`shared/discovery/registry.js`) sans faux Bonjour.
- Checkpoint 0.10.1 (`cursor/mobile-pwa-reprise-a257` / `a41faa8`) intact — pas de force-push.

## 0.15.0

- Node `audiofft` (niveau, pic, bin normalisé via AnalyserNode).
- Videofile : seek + marqueurs + `syncGroup` multi-source, play/pause/loop inchangés.
- WebGL2 `uploadPixels` pour chemin GPU raster explicite.
- Preuves packaging : Playwright 19/19, `.app` macOS arm64, Android sync ; APK/mDNS PLATFORM-LIMITED documentés.

## 0.14.0

- Shadow Lab exécutable (`shared/graphics/shadow.js`) : silhouette, miroir, offset, trail.
- Export Pure Data (`.pd`) et carte OSC Millumin (déclarative).
- Carte hôte visible sur desktop (préfs I/O) + balise LAN UDP (`bridge/lan-discovery.mjs`). mDNS Bonjour reste PLATFORM-LIMITED.
- Serial reconnect (`serial reconnect` + auto-reopen des ports déjà autorisés).
- Stage desktop : GO / cue précédent / suivant / PANIC branchés sur `shared/stage/cues.js`.

## 0.13.0

- Art-Net UDP réel (codec + `bridge/artnet-udp.mjs` + IPC Electron).
- Nodes audio exécutables `audiofilter` / `audiodelay` (Web Audio).
- MIDI Learn (`shared/adapters/midi-learn.js`) — armement, timeout, mapping CC/note.
- Scaffold Capacitor Android (`capacitor.config.json`, `npm run android:sync`, `docs/ANDROID.md`) consommant `dist/pwa`.

## 0.12.0

- Composite raster (blend normal/add/multiply/screen) et node `videofile` (erreur explicite sans fichier).
- Runtime dessine les frames pixels (blackhole/transform/composite) vers Preview/OUTPUT.
- Stage cues exécutables (`shared/stage/cues.js`) : GO, next/previous, panic, actions params/OSC/Art-Net déclarées.
- Carte hôte + QR payload + mémoire du dernier hôte (`shared/discovery/host-card.js`). Electron expose OSC UDP et `/nvd-host.json`.

## 0.11.0

- Nodes hérités 0.8.0 portés sur `cvd.graph` avec processeurs réels : `add`, `smooth`, `compare`, `boolean`, `text`, `timer`, `feedback`, `blackhole`, `transform`.
- Ports dynamiques de boîtes (`addBoxPort`, `box-in` / `box-out`) et wrap d’une sélection en sous-patch.
- Format projet `PROJECT_FORMAT` 2 : les projets v1 restent lisibles ; une version future est refusée.
- Fondation graphics : pass graph, backend WebGL2 (erreur explicite sans contexte), raster blackhole/transform.
- Codec OSC 1.0 + envoi UDP Node (`bridge/osc-udp.mjs`). Le navigateur reste sur le bridge WebSocket.

## 0.10.1

- Sec-WebSocket-Accept utilise le GUID de la RFC 6455 (`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`). L’exemple du RFC (`dGhlIHNhbXBsZSBub25jZQ==` → `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`) passe. Le caractère erroné « 9 » faisait refuser la poignée à Chrome.
- `NVD_WS_GUID` reste une option de debug. Les tests n’en dépendent plus.
- Tests Playwright : zoom, pan, duplication, Preview/OUTPUT, préférences enregistrées puis restaurées.

## 0.10.0

Nouvelle surface installable, pas un correctif de 0.9.4 : le numéro de mineur passe à 0.10.0.

- PWA mobile (`npm run build:pwa` → `dist/pwa/`) : manifest, icônes 192/512 et maskable, service worker, cache local, bannière « nouvelle version » sans rechargement silencieux.
- L’interface téléphone/tablette reprend le moteur `shared/` (graphe, sous-patches, Undo/Redo, Vibe avec aperçu, nombre × multiplication, sauvegarde IndexedDB). Modes Bureau et Plateau.
- Capteurs téléphone comme nodes exécutables. API absente ou permission refusée : erreur visible, aucune valeur inventée.
- Pont WebSocket (`bridge/remote-server.mjs`, port 4174) pour éditer un projet distant. Conflit de révision signalé. L’hôte Electron publie l’état sans remplacer l’interface desktop.
- Exports Max/MSP et TouchDesigner, OSC, Art-Net, MIDI et Serial inchangés dans leur honnêteté : pas d’envoi annoncé sans passerelle ou périphérique.

## 0.9.4

- Source canonique : boîtes imbriquées qui transportent une valeur (A → B → ×2), garde de profondeur, auto-test.
- Sauvegarde WebKit : copie locale réelle, sans téléchargement qui réussit en apparence.
- OSC / Art-Net : pas d’envoi annoncé quand la passerelle est absente.
- Exports Max/MSP et TouchDesigner pour les nodes nombre, multiplication, MIDI et OSC.
- CI Apple Silicon via electron-builder (`macos-arm64.yml`).
- Histoire `main` 0.8.0 archivée (`archive/main-0.8.0-110a59f`) et joignable sans remplacer cet arbre.

## 0.9.3

- Sous-patches exécutables : édition imbriquée, sérialisation, restauration, propagation d’erreurs.
- Nodes audio opérationnels (Web Audio) : tone / micro, niveaux, arrêt sans résidu.
- Vibe coding : aperçu des opérations avant application, annulable (Undo).
- Manuel et matrice de preuves mis à jour.
- Build Electron Apple Silicon (Chromium embarqué).

## 0.9.2

- Passage au runtime Electron autonome (plus de dépendance obligatoire à Chrome/Brave/Edge).
- Serveur HTTP local intégré au process principal.
- Documentation de la divergence Git `origin/main` vs branche dédiée.

## 0.9.1 — commit `08b4644`

- Undo / Redo, duplication, zoom/pan Patch Canvas.
- Préférences élargies.
- Exclusion explicite Grok / xAI.

## 0.9.0 — commits `07f1a15` … `3edcaae`

- Moteur de graphe P00 : caméra → shader → Preview/OUTPUT.
- Vibe Entrée + moteurs local/IA.
- MIDI/OSC/Serial raccordés au bus patch.
- Build `.app` shell navigateur (transitoire).
- Manuel, démo, tests.
