# Baseline ULTIMATE — inventaire et gel

Date du gel : 2026-09-28  
Dépôt : `https://github.com/cdriccarboni/no-de-vibe-designer.git`  
Checkout : `/Users/cedriccarboni/Projects/No-de-Vibe-Designer`  
Fetch exécuté : `git fetch --all --prune --tags` (aucun objet nouveau).

Ce document fige l’état avant toute consolidation « No-de Vibe Designer Ultimate ». Aucune branche n’a été fusionnée, reset, supprimée ou force-poussée. Aucune phase ULTIMATE n’est lancée.

`main` n’est pas la version la plus avancée. La tête la plus complète, en historique et en arbre de fichiers, est `cursor/mobile-pwa-reprise-a257`.

## 1. État Git exact

### Branche de travail

| Élément | Valeur |
|---|---|
| Branche courante | `cursor/mobile-pwa-reprise-a257` |
| Commit | `a41faa8cc208a96eefb363202381ab917767db1c` |
| Sujet | `fix(0.10.1): poignée WebSocket conforme à l'exemple RFC 6455` |
| Date | 2026-09-27 17:07:23 +0000 |
| Upstream | `origin/cursor/mobile-pwa-reprise-a257` (identique, à jour) |
| Arbre de travail | propre : rien à committer, aucun fichier modifié ou non suivi |
| Stash | vide |
| Remote | `origin` → `https://github.com/cdriccarboni/no-de-vibe-designer.git` |

Le reflog local montre que ce checkout est passé de `cursor/no-de-finalisation-20260927` (`ca6995d`, 0.9.3) à la branche mobile. Les commits 0.9.0 → 0.9.3 ont été faits dans ce dépôt, puis la ligne 0.9.4 / 0.10.x a été récupérée.

### Travail non commité

Aucun. Une sauvegarde Git additive n’a pas été créée : il n’y avait rien de suivi à préserver, et la branche est déjà sur `origin`.

Présents sur le disque mais ignorés par Git (`.gitignore`) :

| Chemin | Taille | Rôle |
|---|---|---|
| `_compare/` | 432 Ko | Copie locale V0.7 et une `.app` « Code Vibe Designer ». Les sources V0.7 sont un sous-ensemble du commit `4b5c7e1` (tag `recovered-code-vibe-designer-mac`). |
| `_incoming/` | 216 Ko | Deux archives zip du 27 septembre, déjà reprises dans `4b5c7e1`. |
| `dist/` | 506 Mo | Builds locaux (`.app`, zips 0.9.3 / `08b4644`, `dist/electron`). Régénérables, non versionnés. |
| `node_modules/` | 556 Mo | Dépendances installées. |

Ces dossiers ne sont pas une seconde ligne de source. Ils n’ont pas été ajoutés à Git.

### `main` local et `origin/main` ne sont pas le même commit

| Ref | Commit | Version livrée par l’arbre | Relation avec HEAD |
|---|---|---|---|
| `main` (local) | `3edcaaeca8954cae705debadfed33438dc4caea8` | 0.9.0, `.app` shell navigateur | ancêtre strict. 0 commit propre. **Pas d’upstream.** |
| `origin/main` | `0b835a998cdc27fb9110b248fdbf556d5aa55849` | 0.9.4 canonique | ancêtre strict. HEAD a **2 commits** de plus. |
| HEAD | `a41faa8cc208a96eefb363202381ab917767db1c` | **0.10.1** | contient `origin/main`, donc aussi 0.9.4, 0.9.3, 0.9.0 et l’archive 0.8.0 comme ancêtre d’historique |

`git rev-list --left-right --count origin/main...HEAD` → `0 2`.  
`git rev-list --left-right --count main...origin/main` → `0 26`.

`origin/HEAD` pointe vers `origin/main`. Avancer le `main` local serait un fast-forward, pas une divergence, mais ce fast-forward n’a pas été fait.

### Branches

| Branche | Commit | Upstream | Contenu propre par rapport à HEAD |
|---|---|---|---|
| `cursor/mobile-pwa-reprise-a257` | `a41faa8` | `origin/…` à jour | tête courante, 0.10.1 |
| `main` | `3edcaae` | aucun | ancêtre 0.9.0 |
| `cursor/no-de-finalisation-20260927` | `ca6995d` | remote **gone** après prune | ancêtre 0.9.3. Même commit que le tag `v0.9.3-pre.ca6995d` et que `origin/backup/wip-20260927/No-de-finalisation-0.9.3-1720` |
| `cx/task-1366-…`, `cx/task-1383-…`, `cx/task-1389-…`, `cx/task-1390-…`, `cx/task-1391-…` | `a20fa55` | worktrees CX, propres | ancêtre « docs: add P00 production specification ». Aucun commit propre |

Remotes encore présentes après prune :

| Branche distante | Commit | Note |
|---|---|---|
| `origin/main` | `0b835a9` | 0.9.4, PR #2 mergée |
| `origin/cursor/mobile-pwa-reprise-a257` | `a41faa8` | PR #3, brouillon |
| `origin/archive/main-0.8.0` | `110a59f` | ancien `main`, arbre `app/` |
| `origin/archive/vibe-designer-local/main` | `e445fb7` | V0.3, historique sans ancêtre commun |
| `origin/archive/vibe-designer-local/cx/task-1327-Vibe-Designer` | `e445fb7` | même commit que V0.3 |
| `origin/backup/wip-20260927/No-de-finalisation-0.9.3-1720` | `ca6995d` | copie de la branche 0.9.3 dont le remote d’origine a disparu |
| `origin/backup/wip-20260927/No-de-main-local-0.9.0-1720` | `3edcaae` | copie du `main` local 0.9.0 |

La branche distante `cursor/canonical-0.9.4-2428` n’existe plus : son contenu est le merge de la PR #2 (`0b835a9`).

### Worktrees

Tous propres.

| Chemin | HEAD |
|---|---|
| `/Users/cedriccarboni/Projects/No-de-Vibe-Designer` | `a41faa8` branche mobile |
| `…/CX hub/worktrees/No-de-Vibe-Designer-1366` | `a20fa55` |
| `…/CX hub/worktrees/No-de-Vibe-Designer-1383` | `a20fa55` |
| `…/CX hub/worktrees/No-de-Vibe-Designer-1389` | `a20fa55` |
| `…/CX hub/worktrees/No-de-Vibe-Designer-1390` | `a20fa55` |
| `…/CX hub/worktrees/No-de-Vibe-Designer-1391` | `a20fa55` |

### Tags

| Tag | Commit | Contenu |
|---|---|---|
| `v0.9.3-pre.ca6995d` | `ca6995d` | Electron 0.9.3, ancêtre de HEAD |
| `archive/main-0.8.0-110a59f` | `110a59f` | arbre 0.8.0 `app/` |
| `archive/branch/ci/macos-0.8.0-acceptance` | `a49145c` | **pas** ancêtre de HEAD ni de `110a59f`. Deux commits au-dessus de la ligne 0.8.0 (`6cf801a`, `a49145c`) : repli de packaging darwin arm64 si le runner macOS manque |
| `no-de-vibe-designer-baseline` | `4937534` | renommage Code Vibe Designer → No-de |
| `recovered-code-vibe-designer-mac` | `4b5c7e1` | récupération Mac V0.7, ancêtre de la ligne produit |

### Pull requests

| PR | État | Base → tête | Effet |
|---|---|---|---|
| [#3](https://github.com/cdriccarboni/no-de-vibe-designer/pull/3) | **OPEN, brouillon, MERGEABLE** | `main` ← `cursor/mobile-pwa-reprise-a257` | 0.10.1, +3986 / −353, 49 fichiers. Non mergée. |
| [#2](https://github.com/cdriccarboni/no-de-vibe-designer/pull/2) | MERGED 2026-09-27 | `main` ← `cursor/canonical-0.9.4-2428` | `0b835a9` : 0.9.4 devient le `main` canonique |
| [#1](https://github.com/cdriccarboni/no-de-vibe-designer/pull/1) | CLOSED, non mergée | `main` ← `ci/macos-0.8.0-acceptance` | acceptation packagée 0.8.0. Le tag `a49145c` en garde la pointe |

### Chaîne d’ancêtres (first-parent utile)

```text
a41faa8  0.10.1  WebSocket RFC          ← HEAD
e969b12  0.10.0  PWA mobile / shared
0b835a9  origin/main  « 0.9.4 becomes canonical main »
1380664  merge -s ours : arbre 0.9.4, second parent = 110a59f
fc88ac6  0.9.4  arbre canonique
ca6995d  0.9.3  Electron, sous-patches, audio, vibe
08b4644  0.9.1  undo, zoom/pan, duplication, exclusion Grok/xAI
3edcaae  main local  0.9.0  .app HTTP
…        P00 graphe caméra → shader
a20fa55  worktrees CX
4b5c7e1  récupération Mac
```

Le second parent de `1380664` est `110a59f` (0.8.0). La stratégie `ours` a **gardé l’arbre 0.9.4** et n’a enregistré le 0.8.0 que comme ancêtre. Les fichiers `app/` ne sont pas dans 0.9.4 ni dans 0.10.1.

`e445fb7` (V0.3) n’a pas d’ancêtre commun avec HEAD.

## 2. Branche et commit de départ proposés

Départ ULTIMATE, si la phase est validée plus tard :

- branche : `cursor/mobile-pwa-reprise-a257`
- commit : `a41faa8cc208a96eefb363202381ab917767db1c`
- version d’arbre : **0.10.1** (`package.json`, `shared/version.js`)

Ce n’est pas `main` local (0.9.0) et ce n’est pas `origin/main` (0.9.4). Les deux sont contenus dans cette tête. Repartir de l’un d’eux retirerait la PWA et le correctif WebSocket.

## 3. Fonctions présentes sur 0.10.1

Même schéma de projet : `.cvd.json`, `cvd.graph`. Trois surfaces, un moteur `shared/`.

### Desktop

- UI patch : `desktop/index.html`, `desktop/app.js`, `desktop/styles.css`, `desktop/output.html`.
- Canvas, bibliothèque, inspecteur, Preview / OUTPUT.
- Undo / redo, zoom / pan, duplication (depuis 0.9.1, toujours dans l’arbre).
- Vibe : aperçu qui ne mute pas le graphe, application, annulation. Fournisseurs Grok / xAI refusés.
- Sauvegarde : dialogue natif Electron, ou copie locale honnête en WebKit autonome (`shared/save-fallback.js`).

### Mobile et PWA

- Sources `mobile/` : modes Bureau (édition) et Plateau (cues, GO).
- Manifest, icônes 192 / 512 et maskable, service worker `mobile/sw.js`.
- Build `npm run build:pwa` → `dist/pwa/` (non versionné). Serveur local `npm run serve:pwa` (port 4175).
- Bannière de mise à jour sans rechargement silencieux (`shared/pwa-update.js`).
- Projet dans IndexedDB (`shared/project-store.js`), miroir `localStorage`.
- Android / Capacitor : documenté, **pas branché**. `webDir` prévu = `dist/pwa`.

### Moteur partagé

- Graphe : types, arêtes, cycles avec valeur de frame précédente (`shared/graph-engine.js`).
- IR projet, démo caméra → shader (`shared/ir.js`).
- Sous-patches imbriqués, profondeur max 32, transport de valeur (`shared/subpatch.js`, `shared/self-test.js`).
- Processeurs exécutables (`shared/node-processors.js`) : `camera`, `phone-camera-front`, `phone-camera-back`, `shader`, `midi`, `osc`, `number`, `multiply`, `tracking`, `stageio`, `audio`, `organicaudio`, `soundmemo`, `dmx`, `phone-mic`, `gyro`, `accelerometer`, `orientation`, `gps`, `touch`, `multitouch`, `wifi`, `bluetooth`, `haptics`, `subpatch`.
- Audio Web Audio (`shared/audio-engine.js`).
- Historique (`shared/history.js`), exports Max/MSP et TouchDesigner (`shared/exporters.js`).
- Capteurs : lecture réelle ou erreur visible, pas de valeur inventée (`shared/sensor-bus.js`).
- Routage par piste (`shared/routing.js`).

### Bridge

- `bridge/remote-server.mjs`, `bridge/ws-frames.mjs`, `bridge/ws-client.mjs`.
- Protocole à révisions (`shared/remote-protocol.js`, `shared/remote-client.js`), conflit si révision périmée.
- GUID WebSocket RFC 6455. L’exemple `dGhlIHNhbXBsZSBub25jZQ==` → `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=` est testé. `NVD_WS_GUID` reste une option de debug.
- Port par défaut 4174. OSC et Art-Net : paquets JSON vers le bridge. Sans pont, erreur visible et aucun envoi annoncé.

### Electron

- `electron/main.cjs` + `electron/preload.cjs`.
- Chromium embarqué, serveur HTTP local, démarrage du pont sans bloquer la fenêtre.
- `--smoke-test` pour la CI.
- `SOURCE_COMMIT` dans `shared/version.js` est une chaîne vide.

### Contrôleurs, devices, protocoles

- Web MIDI (`shared/adapters/midi.js`) et Web Serial (`shared/adapters/serial.js`), regroupés par `shared/device-manager.js` (commandes texte : connect, send, OSC, Art-Net).
- Shader WebGL (`shared/adapters/shader-surface.js`).
- Bridge WebSocket JSON (`shared/adapters/websocket-bridge.js`) pour OSC et Art-Net.
- Honnêteté assumée : pas d’envoi déclaré si la passerelle ou le périphérique manque.

### UI catalogue

`shared/node-specs.js` expose une grande bibliothèque (vidéo, shaders, bridges Max/TD/Isadora/Millumin/Chataigne, Arduino, ESP, RFID, etc.). Seuls les types listés dans `EXECUTABLE_PORTS` (`shared/ports.js`) sont exécutés. Le commentaire du module dit que les autres restent décoratifs (`unavailable`).

### Packaging

- electron-builder : `pack:mac` / `dist:mac` (dir + zip, arm64), `pack:linux` (zip x64).
- Identité de signature : `null`. Hardened runtime et Gatekeeper désactivés. Non signé, non notarisé.
- Scripts historiques encore dans l’arbre : `packaging/mac/BUILD-No-de-Vibe-Designer-app.command` (shell navigateur 0.9.0), `BUILD-Electron-No-de-Vibe-Designer.command`, `INSTALLER-…`, `launcher`, `Info.plist`, `VibeDesigner.icns`.
- CI `.github/workflows/macos-arm64.yml` : `npm test` + `npm run check` sur Ubuntu, puis sur `macos-14` electron-builder arm64, smoke test de la `.app`, upload du zip. Déclenchée sur PR/push vers `main` et tags `v*`.

## 4. Fonctions uniquement présentes sur d’autres refs

Elles ne sont pas dans l’arbre 0.10.1. Un merge de fichiers les écraserait ou les dupliquerait. Les reprendre, si on le décide, doit être un port explicite vers `cvd.graph`.

### Archive 0.8.0 — `110a59f` (`app/`, schéma `nodevibe.graph` v2)

Arbre parallèle, joint seulement comme second parent. Nodes et mécanismes absents du moteur actuel :

- Logique : `boolean`, `text`, `add`, `smooth`, `compare`, `trigger`, `timer`, `feedback` (retard d’une frame comme node).
- Visuel : `blackhole`, `transform`, `preview` comme node, `luma-track`.
- Entrées / sorties dédiées : `midi-in`, `osc-out`, `artnet-out`, `serial-in`.
- Boîtes à ports dynamiques : `addBoxPort`, `patch-in`, `patch-out`, `wrapNodesInSubpatch`.
- Espace multi-patch : dictionnaire `patches`, fils d’Ariane, zoom et pan par patch dans le projet.
- Migration d’un ancien `cvd.graph` v1 vers `nodevibe.graph` v2 (`migrateV1`).
- Packaging CI d’origine : `@electron/packager`, Electron 44.4.5, `codesign --sign -`, release GitHub sur tag. La CI 0.10.1 utilise electron-builder 33.x, sans signature ad hoc et sans `gh release`.

Le test critique « boîtes imbriquées = 6 » a été **réécrit** dans `shared/self-test.js` sur le schéma `cvd.graph`. Ce n’est pas le même IR.

### Tag CI 0.8.0 — `a49145c` (PR #1 fermée)

- Repli de cross-packaging darwin arm64 quand le runner macOS natif n’est pas disponible.
- `docs/CI_ACCEPTANCE.md`.
- Absent de `110a59f` et de HEAD. La CI actuelle suppose un runner `macos-14`.

### V0.3 — `e445fb7` (historique non relié)

Prototype `server.py` + `app.js` : vues PATCH / STAGE / VIBE, bridge **UDP OSC** vers Patcher (`127.0.0.1:9000`, `/vibe/test`, `/vibe/intent`). Le pont 0.10.1 est du WebSocket JSON, pas de l’UDP OSC.

### Ligne 0.9.x et worktrees CX

0.9.0, 0.9.3, 0.9.4 et `a20fa55` sont des ancêtres. Ils n’ont pas de fonction absente de 0.10.1. Les worktrees CX sont des checkouts anciens, pas une réserve de code.

### `origin/main` 0.9.4

Strictement inclus dans HEAD. Il n’a pas la PWA, le pont distant, les capteurs exécutables, IndexedDB, ni le GUID WebSocket corrigé.

## 5. Éléments incomplets sur 0.10.1

D’après le code et `docs/SYSTEM_TEST.md` / `docs/PROOF_MATRIX.md` (constats de la passe 0.10.1, non rejoués pendant ce gel) :

- Catalogue décoratif : dizaines de types dans `NODE_GROUPS` sans processeur (retours vidéo, mapping, shaders nommés, p5, bridges Max/TD/Isadora/Millumin/Chataigne, Arduino, ESP, servo, RFID, automation, etc.).
- Android / Capacitor non branché.
- Hôte Electron du pont : le process démarre le serveur ; la fenêtre et la `.app` n’ont pas été relancées dans la passe 0.10.1.
- `.app` macOS non reconstruite dans cette passe. `dist/` local contient surtout des artefacts 0.9.3.
- Signature et notarisation absentes.
- `SOURCE_COMMIT` vide.
- Matériel non validé : MIDI, Serial, OSC / Art-Net hors localhost, capteurs physiques, installation PWA Pixel / tablette, mode `display-mode: standalone` réel, réseau Wi-Fi au-delà de `navigator.onLine` (pas de SSID).
- Multitouch : le pad note un contact ; pas de geste automatisé.
- Deux chemins de packaging coexistent (shell 0.9.0 et Electron).
- NDI / Syphon / Spout : cités dans `docs/PATCHER_AUDIT.md` comme non simulés.
- Pas d’UDP OSC natif (écart avec V0.3).

## 6. Régressions potentielles

À ne pas déclencher par un « merge de main » automatique.

1. Partir de `main` local (`3edcaae`) efface Electron, l’audio, les sous-patches 0.9.3, le canonique 0.9.4 et toute la PWA 0.10.x. Ce ref n’a même pas de `package.json`.
2. Partir de `origin/main` (`0b835a9`) efface 0.10.0 et 0.10.1 (PWA, bridge, capteurs, correctif RFC).
3. Fusionner l’arbre `app/` du 0.8.0 dans 0.10.1 mélange deux schémas (`nodevibe.graph` / patches contre `cvd.graph` / nodes+edges) et deux layouts (`app/` contre `desktop/`+`shared/`). Le merge `ours` de `1380664` a été fait pour éviter ça. Le refaire dans l’autre sens réintroduirait des fichiers que la jointure a volontairement laissés de côté.
4. Traiter les nodes 0.8.0 comme déjà présents parce que le commit est ancêtre : l’historique les contient, l’arbre livré non. `boolean`, `add`, `smooth`, `timer`, `blackhole`, ports dynamiques et `wrapNodesInSubpatch` ne sont pas dans `shared/`.
5. La branche `cursor/no-de-finalisation-20260927` a perdu son remote. Le commit `ca6995d` reste local, tagué, et sur `origin/backup/wip-20260927/…`. Supprimer la branche locale ou le backup perdrait le pointeur, pas l’histoire (elle est dans HEAD), mais le pointeur nommé disparaîtrait.
6. Les cinq worktrees CX sont sur `a20fa55`. Un reset de ces branches casserait des tâches CX encore ouvertes sur ce commit.
7. `git checkout main` dans ce dossier, sans fast-forward préalable, ouvre la 0.9.0. Le `main` local ne suit pas `origin/main`.
8. PR #3 est un brouillon. `origin/main` ne contient pas 0.10.1 tant qu’elle n’est pas mergée. Un clone frais sur `main` ne voit pas la PWA.
9. La CI 0.10.1 ne reprend pas le repli cross-package de `a49145c`. Sans runner `macos-14`, le job arm64 ne se replie pas tout seul.
10. Builds non signés : Gatekeeper peut bloquer une `.app` reconstruite. Ce n’est pas une régression de code, c’est l’état de livraison actuel.

## 7. Tests disponibles

Non relancés pendant ce gel. Les chiffres ci-dessous sont ceux écrits dans `docs/SYSTEM_TEST.md` et dans la PR #3.

| Commande | Rôle | Résultat documenté |
|---|---|---|
| `npm test` → `node tests/run.mjs` | Moteur, types, cycles, démo caméra→shader, vibe, historique, politique IA, sous-patches (valeur 6, profondeur 32), sauvegarde WebKit, OSC/Art-Net sans pont, audio, exports Max et TouchDesigner, bannière PWA, store mémoire, capteurs, protocole distant, GUID RFC, pont WebSocket | 86 OK, 0 FAIL |
| `npm run test:pwa` | Playwright, `playwright.config.mjs`, 19 tests dans `tests/pwa/mobile.spec.mjs` | 19 passed |
| `npm run check` | `node --check` sur Electron, desktop, mobile, bridge, protocole, sensor-bus | OK selon la matrice |

Couverture Playwright nommée : manifest et service worker, hors-ligne, persistance, nombre × multiplication, sous-patch, undo/redo, vibe, refus micro/caméra, MIDI/OSC/Art-Net/Serial absents, perte et reconnexion WebSocket, conflit distant, port refusé, cue GO, zoom/pan, duplication, Preview/OUTPUT, préférences, Bureau/Plateau, bannière de mise à jour.

Archive 0.8.0, non branchée sur cet arbre : `npm test` = `node --test test/core.test.mjs` (boîtes imbriquées, types, cycles, vibe, wrap, exports, migration v1). Ce fichier n’existe pas sur 0.10.1.

Matrices : `docs/SYSTEM_TEST.md`, `docs/PROOF_MATRIX.md`, `docs/TEST_MATRIX.md`.

## 8. Architecture actuelle (0.10.1)

```text
shared/                  moteur unique, schéma cvd.graph
  graph-engine.js        évaluation, types, cycles
  node-processors.js     nodes réellement exécutés
  node-specs.js          catalogue UI (beaucoup de types non exécutés)
  ports.js               ports et types exécutables
  ir.js subpatch.js history.js vibe.js exporters.js
  runtime.js audio-engine.js self-test.js routing.js
  project-store.js sensor-bus.js pwa-update.js
  remote-protocol.js remote-client.js save-fallback.js
  adapters/              MIDI, Serial, shader WebGL, paquets OSC/Art-Net
desktop/                 UI Mac
electron/                fenêtre, HTTP local, pont, --smoke-test
bridge/                  serveur WebSocket RFC 6455, défaut 127.0.0.1:4174
mobile/                  sources PWA Bureau / Plateau
scripts/                 build-pwa, serve-pwa, icônes
packaging/mac/           icône, plist, lanceurs shell et Electron
dist/pwa/                build généré, ignoré
```

Le build PWA réécrit les imports `../shared/` en `./shared/` pour le cache du service worker. Les sources `mobile/` ne sont pas le dossier à installer.

Ligne 0.8.0, à titre de contraste seulement :

```text
app/main.cjs  app/preload.cjs  app/desktop/  app/shared/{graph,runtime-core,vibe,exporters}.js
test/core.test.mjs
schéma nodevibe.graph v2
```

## 9. Stratégie de consolidation proposée

À valider avant toute action. Rien de cette liste n’est exécuté.

1. **Geler la base sur `a41faa8` (0.10.1).** C’est le seul arbre qui contient 0.9.4 et la reprise mobile. Ne pas recréer l’histoire.
2. **Ne pas fast-forward `main` local tant que ce n’est pas décidé.** C’est sans conflit (`3edcaae` est ancêtre de `origin/main`), mais ça change le ref sur lequel les worktrees et les habitudes locales s’appuient. Le `main` local n’a pas d’upstream : un `git pull` ne le mettra pas à jour tout seul.
3. **Laisser la PR #3 en brouillon** jusqu’à accord. La merger serait un fast-forward de `origin/main` vers 0.10.1 (0 commit du côté `main`). C’est la voie non destructive pour que `main` distant porte la PWA. Ce n’est pas une fusion avec le 0.8.0.
4. **Ne pas rejouer un merge de l’arbre `app/`.** Porter, fonction par fonction, seulement ce qui manque vraiment et qui a un test : en priorité `add`, `smooth`, `compare`, `boolean`, `text`, `timer`, `feedback`, `wrap` de sélection, ports de boîte dynamiques, node Serial. Chaque port vise `cvd.graph`, pas `nodevibe.graph`.
5. **Décider à part l’OSC UDP de la V0.3.** Le bridge actuel annonce OSC via JSON WebSocket. Ce n’est pas un socket UDP vers Patcher. Le reprendre est un choix de protocole, pas un merge de `server.py`.
6. **Garder les pointeurs nommés.** Ne pas supprimer `cursor/no-de-finalisation-20260927`, les backups `origin/backup/wip-20260927/…`, les tags, ni les worktrees CX. Le remote « gone » est déjà couvert par le tag `v0.9.3-pre.ca6995d` et la branche backup.
7. **CI.** Garder le workflow electron-builder de 0.10.1. Le repli cross-package de `a49145c` ne s’applique qu’à l’arbre `app/` 0.8.0 ; le recopier tel quel ne construit pas 0.10.1.
8. **Preuve avant de changer de numéro.** Relancer `npm test`, `npm run test:pwa` et `npm run check` sur `a41faa8`, puis seulement ensuite décider d’une branche `ultimate` créée **depuis** ce commit (additive, pas un reset).
9. **Matériel et signature** restent hors de la consolidation Git : Pixel/tablette, MIDI, Serial, OSC réel, hôte Electron vu d’un autre appareil, notarisation.

## 10. Ce qui n’a pas été fait

- Aucun commit, aucune branche créée, aucun tag.
- Aucun checkout, merge, rebase, reset, clean, push, force-push.
- Aucune suppression de branche, de tag, de worktree ou de fichier ignoré.
- Les tests n’ont pas été relancés.
- La phase ULTIMATE n’est pas ouverte.
