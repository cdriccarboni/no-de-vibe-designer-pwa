# Passation — No[co]de Vibe Designer (PWA publique) · 3.3.17 · 16/10/2026

Ce document permet de reprendre le travail (Hermès, Antigravity, ou à la main) **sans Grok Bot ni Cursor** :
uniquement git, Node 22, Playwright et GitHub Actions.

## Où vit quoi
- Ce dépôt (`cdriccarboni/no-de-vibe-designer-pwa`) est la **source de la ligne publique** : GitHub Pages sert `main` à la racine
  → https://cdriccarboni.github.io/no-de-vibe-designer-pwa/ (Designer : `/desktop/`). Fusionner sur `main` = publier.
- Chaque push sur `main` déclenche aussi les builds Android (APK debug) et macOS, publiés dans la release GitHub `v<version>`.
  **Aucun AAB n'est publié** (AAB signé seulement envoyé à Google Play *internal* si le message de commit contient `[play-internal]`
  ou en lancement manuel — ne jamais l'utiliser pour la production).
- Le dépôt privé `cdriccarboni/no-de-vibe-designer` est une ligne plus ancienne (backup-work) ; il ne produit pas la PWA publique.

## État par brique (légende : TESTÉ = test automatisé réel · PARTIEL · SIMULÉ · MATÉRIEL ABSENT)
| Brique | État | Preuve / limite |
|---|---|---|
| Designer (Library, câblage, undo, export) | TESTÉ | `qa/designer-workflow-e2e.mjs`, `qa/browser-e2e-designer.cjs` |
| Responsive 375→1440 px (Bureau/Plateau/Exemple) | TESTÉ | `qa/responsive-modes-e2e.mjs` (clics réels) |
| Surfaces publiques (liens, 404, nom produit) | TESTÉ | `qa/surfaces-smoke-e2e.mjs` |
| libpd (calcul, audible, gain, enveloppe) | TESTÉ | `qa/libpd-audio-offline-e2e.mjs` (OfflineAudioContext, 440 Hz) |
| libpd « Écouter » (inspecteur) | TESTÉ | `qa/libpd-listen-oscws-e2e.mjs` (AnalyserNode, RMS > 0) |
| libpd → graphe audio partagé (Mixer/Gain) | TESTÉ | `qa/media-truth-chains-e2e.mjs` ; 44,1 kHz, un patch à la fois |
| Micro (Audio In : RMS/FFT/enveloppe) | TESTÉ en SIMULÉ · MATÉRIEL ABSENT | faux micro Chromium ; micro physique non testé |
| Caméra → Optical Flow → Shader | TESTÉ en SIMULÉ · MATÉRIEL ABSENT | fausse caméra Chromium ; caméra physique non testée |
| Micro RMS → Flow Field (particules) | TESTÉ en SIMULÉ | `qa/media-truth-chains-e2e.mjs` |
| États refusé / aucun périphérique | TESTÉ | idem (`--deny-permission-prompts`, sans faux périphérique) |
| Web MIDI | PARTIEL · MATÉRIEL ABSENT | décodage/envoi testés avec mocks (`shared/midi-osc-adapters.test.mjs`) ; aucun contrôleur réel |
| OSC sur WebSocket | TESTÉ (local) · PARTIEL (public) | serveur WS simulé en local ; depuis github.io, Chromium bloque `ws://127.0.0.1` (voir blocages) |
| OSC UDP / Art-Net / sACN | PARTIEL | octets conformes (`qa/protocols-qa.mjs`) ; UDP seulement via app de bureau ou passerelle |
| Serial / Arduino / ESP32 / GPIO / NDI | MATÉRIEL ABSENT | nodes « Test à supprimer » (test-ndi-in/out, test-arduino, test-esp32, test-gpio-in/out) = SIMULÉS, à conserver |
| Radio / diffusion | TESTÉ (logique) | `qa/radio-broadcast-qa.mjs`, `qa/radio-ui-qa.mjs` |
| Remote Camera QR | TESTÉ | `qa/remote-camera-qr-e2e.mjs` |
| Régie LAN : pont appairé (code, hôte réservé, Origin) | TESTÉ | `qa/regie-bridge-qa.mjs` (32/32) · guide `docs/REGIE-LAN.md` |
| Companion ↔ Designer (QR → connexion auto → commande → retour, reprise) | TESTÉ (Chrome, mobile émulé) · MATÉRIEL ABSENT | `qa/companion-roundtrip-e2e.mjs` (20/20) ; téléphones physiques non testés |
| Desktop avec pont de régie (`electron/main.cjs`) | PARTIEL | logique testée avec Electron simulé (`qa/electron-main-qa.mjs`, 7/7) ; inactif dans les builds tant que `docs/ci/electron-regie-bridge.patch` n'est pas appliqué |
| Confidentialité (aucune donnée privée) | TESTÉ | `qa/privacy-guard.mjs` + workflow `privacy-guard.yml` |
| Garde-fou de version | TESTÉ | `qa/version-guard.mjs` (jamais inférieure à la version publiée) |

## Lancer tous les tests
```bash
git clone https://github.com/cdriccarboni/no-de-vibe-designer-pwa.git && cd no-de-vibe-designer-pwa
mkdir -p /tmp/pw && npm i --prefix /tmp/pw playwright && npx --prefix /tmp/pw playwright install --with-deps chromium
PLAYWRIGHT_PATH=/tmp/pw/node_modules/playwright bash qa/run-all.sh     # attendu : N réussis · 0 en échec · 0 non exécutés
```
`CHROME=/chemin/chrome` force un autre navigateur (sur Mac, défaut : Google Chrome.app). Sans `PLAYWRIGHT_PATH`,
les tests navigateur sont listés « non exécutés », jamais comptés comme réussis. Serveur local : `node scripts/serve.mjs` (port 3333).

## Publier une version
Voir `docs/RELEASE.md`. Résumé : incrémenter la version **vers le haut** partout (`shared/version.js`, `build-info.json`,
`sw.js` nom de cache, badge `desktop/index.html`, `install/index.html`, `README.md`), `node qa/version-guard.mjs`,
QA complète, PR vers `main` (CI `Runtime QA` + `privacy-guard`), fusion, puis vérifier en ligne :
`curl -s https://cdriccarboni.github.io/no-de-vibe-designer-pwa/build-info.json` et
`NVD_URL=https://cdriccarboni.github.io/no-de-vibe-designer-pwa/desktop/index.html PLAYWRIGHT_PATH=… node qa/responsive-modes-e2e.mjs`.
Laisser 1 à 3 minutes au CDN Pages ; un premier passage juste après déploiement peut mélanger anciens/nouveaux fichiers : relancer.
Ne pas toucher `.release-trigger` sauf pour lancer volontairement le workflow Release.

## Blocages connus
0. **Builds desktop sans pont de régie** : appliquer `git apply docs/ci/electron-regie-bridge.patch` (compte avec droit `workflow`)
   pour que les apps macOS/Windows/Linux utilisent `electron/main.cjs` et embarquent `bridge/`. Sans cela, utiliser
   `node bridge/nocode-host.mjs` sur le poste de régie.
1. **Jeton sans droit `workflow`** : l'agent ne peut pas modifier `.github/workflows/*`. Étapes CI prêtes (garde-fou de version,
   gitleaks, E2E responsive) : `git apply docs/ci/runtime-qa-steps.patch` par un compte ayant ce droit ; y ajouter ensuite
   les autres E2E (`libpd-*`, `media-truth-chains`).
2. **OSC WebSocket depuis la PWA publique** : Chromium (Local Network Access) refuse `ws://127.0.0.1`/LAN depuis github.io ;
   l'interface affiche « passerelle requise ». Solution livrée en 3.3.17 : le pont de régie sert l'application en local
   (`node bridge/nocode-host.mjs`, ou app de bureau une fois le patch CI appliqué).
3. libpd : 44,1 kHz uniquement, thread principal (latence ≈ 93 ms), un seul patch audio à la fois, pas d'`adc~`.
4. Matériel réel (micro, caméra, MIDI, Serial, ESP32, NDI, GPIO) jamais testé automatiquement.

## PR ouvertes d'autres agents (au 16/10/2026)
- #20 `fix/vibeout-provider-gateway-20261014` : fusionne sans conflit sur `desktop/*` ; conflits préexistants dans `labs/`.
  La rebaser sur `main` sans faire reculer la version/badge.
- #15 `fix/installer-preferences-qa-20261009` : déjà en conflit avec `main` (obsolète).
- #14 `automation/runtime-qa-pull-request-20261009` : brouillon, aucun fichier commun.

## Règles à respecter
Nom produit exact « No[co]de Vibe Designer ». Jamais de version inférieure à la production. Aucune donnée privée/spectacle,
secret, keystore ou AAB dans ce dépôt public. Pas de Google Play production. Travailler sur des branches dédiées, pas de force push.

## Journal de reprise (dernier point de passage)
- **Date** : 16/10/2026 ~19 h 50 (Europe/Paris) · **Agent** : Claude (session claude.ai/code) · coordinateur : Hermès.
- **Branche** : `claude/regie-lan-companion-20261016` (basée sur `main` 1c93fa0, 3.3.16 de Grok Bot) → PR vers `main`.
- **Fait** : pont de régie LAN appairé, Companion sans reconnexion manuelle, Designer hôte automatique, `electron/main.cjs`,
  patch CI desktop, version 3.3.17, docs (`docs/REGIE-LAN.md`).
- **Tests** : `qa/run-all.sh` = tout vert sauf `surfaces-smoke-e2e` et `version-guard` quand l'environnement n'a pas accès à
  github.io / api.github.com (échecs réseau uniquement, identiques avant la modification) ; `version-guard` OK contre la version
  publiée 3.3.16 lue depuis le Mac.
- **Reste à faire (ordre)** :
  1. Appliquer `docs/ci/electron-regie-bridge.patch` (droit `workflow`), relancer les builds, tester l'app macOS + un vrai téléphone.
  2. Version privée : reporter les commits génériques de cette branche (`bridge/`, `studio/`, `shared/companion-studio/transport-ws.js`,
     `desktop/app.js`, `electron/main.cjs`, tests associés) dans le dépôt privé par PR sélective (voir `docs/PUBLIC_PRIVE.md`).
     par PR sélective — jamais de transfert privé → public.
  3. Timeline/conduite : brancher les tops de la conduite sur le bouton GO du Companion (`binding.kind = "stage"`) et le prouver en E2E.
  4. Matrice d'audit des logiciels de référence (TouchDesigner, Millumin, QLab…) : sources publiques uniquement.
- **REA** : serveur MCP joignable depuis la session (98 outils, réponse structurée vérifiée) ; aucune analyse réalisée faute de
  binaire maison installé sur le Mac ; ne pas l'employer pour décompiler des logiciels propriétaires.
- **Risques** : pare-feu macOS au premier lancement du pont ; port 4174 déjà pris (le desktop essaie 4175→4178).
