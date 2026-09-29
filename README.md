# No-de Vibe Designer

**Source canonique : `main` @ 1.1.0** (`3bf92ff` / PR #5).  
Work **2.2** : `cursor/no-de-2.2-reprise-20260929` — package stays **1.1.0** until DoD.  
Docs : `docs/V2.2_STATUS.md`, `docs/V2.2_TODO.md`, `docs/V2.2_TEST_MATRIX.md`, `docs/FANTASY.md`.  
Recovery only : `cursor/no-de-ultimate-20260928` / checkpoints — never overwrite main.  
Checkpoint 0.10.1 intact : `cursor/mobile-pwa-reprise-a257`.

Même moteur et même format de projet (`.cvd.json`, schéma `cvd.graph`) pour trois interfaces :

1. Mac / Electron (`desktop/`)
2. PWA téléphone et tablette (`mobile/` → build `dist/pwa/`)
3. Android via Capacitor (`webDir` → build PWA) — sans recopier `shared/`

## Lancer le desktop

```bash
npm install
npm start
```

Paquet macOS : `npm run dist:mac` (UNSIGNED tant que `identity: null`)  
Paquet Linux : `npm run pack:linux`

## Lancer la PWA (local — pas ONLINE public)

```bash
npm run build:pwa
npm run serve:pwa
```

`http://127.0.0.1:4175/` — pas un hébergement public.

## Remote Camera Companion (2.2)

```bash
npm run serve:companion
```

Desktop : Library → **Remote Camera** → QR · démarrer hôte.  
Transport adapté d’**ART Intercom** (PeerJS MediaConnection). LIVE seulement après FIRST_FRAME.  
HTTP LAN téléphone = souvent PLATFORM-LIMITED pour getUserMedia (HTTPS requis).

## Pont distant

```bash
npm run remote:bridge
```

## Tests

```bash
npm test
npm run check
npm run test:pwa
```

Matrices : `docs/V2.2_TEST_MATRIX.md` (préférer aux docs 0.10.1 / 1.0.0).
