# No-de Vibe Designer

**Source canonique de développement : 1.1.0** (branche `cursor/no-de-ultimate-20260928`).  
Checkpoint 0.10.1 : `cursor/mobile-pwa-reprise-a257` / PR #3, intact.

L’ancienne ligne `main` (0.8.0, `110a59f`) reste l’archive `archive/main-0.8.0-110a59f` et la branche `archive/main-0.8.0`. Elle n’est pas la version à construire.

Même moteur et même format de projet (`.cvd.json`, schéma `cvd.graph`) pour trois interfaces :

1. Mac / Electron (`desktop/`)
2. PWA téléphone et tablette (`mobile/` → build `dist/pwa/`)
3. Android plus tard, via Capacitor, en pointant le `webDir` vers ce build — sans recopier `shared/`

## Lancer le desktop

```bash
npm install
npm start
```

Paquet macOS : `npm run dist:mac`  
Paquet Linux : `npm run pack:linux`

Le process Electron ouvre aussi le pont distant sur `ws://127.0.0.1:4174`.

## Lancer la PWA

```bash
npm run build:pwa
npm run serve:pwa
```

Puis ouvrir `http://127.0.0.1:4175/`. Le dossier servi est `dist/pwa/` (manifest, service worker, moteur recopié). Ce n’est pas un hébergement public.

Bureau : édition du graphe. Plateau : cues et GO.

## Pont distant

```bash
npm run remote:bridge
```

Le mobile se connecte en WebSocket (Outils → Bureau distant). Sans hôte, le pont applique les opérations. Avec l’app Electron, l’hôte reste la source de vérité.

## Tests

```bash
npm test
npm run test:pwa
```

`npm test` : moteur, sous-patches, Vibe, exports, capteurs, protocole distant.  
`npm run test:pwa` : Playwright sur le build (manifest, hors-ligne, graphe, cues, WebSocket).

Matrices : `docs/SYSTEM_TEST.md`, `docs/PROOF_MATRIX.md`, `docs/TEST_MATRIX.md`.
