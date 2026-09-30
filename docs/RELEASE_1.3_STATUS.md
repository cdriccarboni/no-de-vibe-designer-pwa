# No-de Vibe Designer 1.3.0 — état de release

Date : 2026-09-30

## Produit

- Source canonique : `main`
- Release figée : `release/1.3.0`
- Version : `1.3.0`
- Android versionCode : `130`
- Library : **105/105 nodes exécutables**

## Validé

### PWA
- GitHub Pages : **SUCCESS**
- Runtime QA 1.3 : **SUCCESS**
- service worker : `nvd-1.3.0`
- imports PWA : validés
- syntaxe `mobile.js` + `shared/*.js` : validée

### Moteurs
- Planner théâtre : validé
- phrase Maxime → Présence → Ombre Vivante → Rideau de fils : validée
- Ombre Vivante MIRROR : validée
- Ombre Vivante AUTONOMOUS : validée
- Thread Curtain : validé
- sACN/E1.31 : validé
- Safety Engine : validé
- Companion : 5 presets pratiques validés
- profils régie : 12 profils disponibles

### Android
- APK debug : **BUILD SUCCESS**
- package : `fr.acousmatic.nodevibedesigner`
- version : `1.3.0 (130)`
- min SDK : 24
- target SDK : 36
- signature APK v2 : **VERIFIED**
- AAB non signé : **BUILD SUCCESS**

APK :
https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/No-de-Vibe-Designer-1.3.0-debug.apk

Rapport :
https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/android-verification.txt

## Desktop privé — état exact

Les workflows privés Mac/Linux/Android sont déclenchés, mais les jobs se terminent avec :
- **aucune étape**
- pas de runner attribué

Exemples du dernier commit :
- `android` : 0 step
- `linux-x64` : 0 step
- `test` macOS : 0 step
- `build-macos-arm64` : 0 step

Ce comportement est un blocage GitHub Actions avant exécution, pas un résultat de tests du logiciel.

Le dépôt public, lui, reçoit bien des runners et exécute les builds/QA correctement.

## Mac local

Desktop Commander :
- machine : `MacBook-Air-M4-de-Cdric.local`
- état : **OFFLINE**
- installation locale impossible tant que le Mac n'est pas joignable.

Dès que le Mac revient en ligne :
1. synchroniser `main` ;
2. `npm ci` ;
3. `npm run release:check` ;
4. `npm run dist:mac` ;
5. installer/lancer l'app ARM64 ;
6. recette visuelle + réseau + Remote Camera + Companion.

## Règle P0

Voir `AGENTS.md` :
- exécuter directement quand possible ;
- préciser ce que l'agent peut faire ;
- demander une action humaine uniquement quand elle est réellement nécessaire ;
- ne pas déléguer à Cursor par défaut.
