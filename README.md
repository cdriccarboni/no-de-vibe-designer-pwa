# No-de Vibe Designer

**Source canonique : `main` · No-de Vibe Designer **1.2.0**.**  
Production readiness : `docs/PRODUCTION_READINESS.md`.  
La Library est à **81/81 nodes exécutables** ; les limites matérielles ou logicielles externes restent explicitement signalées.  

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

## Validation production

```bash
npm run release:check
npm run test:pwa
```

`release:check` lance l’audit 81/81, les tests, les checks syntaxiques et le build PWA. Voir `docs/PRODUCTION_READINESS.md`.
