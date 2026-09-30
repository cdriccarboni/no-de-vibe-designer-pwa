# No-de Vibe Designer

**Source canonique : `main` · No-de Vibe Designer V3.0.1.**  
Production readiness : `docs/PRODUCTION_READINESS.md`.  
La Library est à **105/105 nodes exécutables** ; les limites matérielles ou logicielles externes restent explicitement signalées.

No-de est un environnement nodal de création et de régie pour le spectacle vivant : discret, local-first, orienté terrain et pilotable depuis desktop, téléphone ou tablette.

Même moteur et même format de projet (`.cvd.json`, schéma `cvd.graph`) pour :
1. Mac / Electron (`desktop/`)
2. PWA téléphone et tablette (`mobile/` → `dist/pwa/`)
3. Android via Capacitor
4. Companion Studio tablette (`studio/`)

## V3 · Graphics Engine

- **Graphics Engine V3** : registre WebGPU / WebGL2 / CPU et familles de moteurs communes.
- **WebGPU / WGSL** : backend réel initialisable pour les moteurs compute/render, avec fallback explicite.
- **SuperNodes sans nouveau panneau** : Digital Curtain, Living Shadow, Feedback Dream, Particle Field et Quick Map passent par Magic FX.
- **Quick Map téléphone** : quatre coins manipulables depuis Mobile, micro-ajustement, synchronisation Bureau distant et sauvegarde dans le projet.
- **Mapping projectif réel** : homographie + warp perspective, avec fallback CPU déterministe.
- Documentation : `docs/V3_GRAPHICS_ENGINE.md`.
- **Image → Vibe** : photo/dessin en référence locale, analyse palette/contraste/contours et génération exécutable Auto, p5/Canvas, GLSL, Particules ou SDF.
- **Manuel novice-first** : parcours « première régie en 10 minutes », Quick Map téléphone et dépannage terrain dans `docs/manual/`.

## Base consolidée héritée de 1.4.0

- **PWA multi-surface** : Designer complet, Mobile, Régie, Plateau et Remote Camera dans une seule PWA.
- **Bascule universelle** : tout appareil peut changer de rôle à tout moment ; Auto n’est qu’un défaut de démarrage.
- **Deuxième ordinateur = télécommande possible** via Régie/Plateau, sans téléphone obligatoire.
- **Cache multi-surface** : service worker commun fingerprinté `nvd-3.0.x-multi-*`, sans confusion entre écrans.

- **105/105 moteurs** : plus aucun node de Library sans ports + processeur.
- **Vibe local-first** : Qwen/Ollama local prioritaire, Planner déterministe amélioré et Safety Engine indépendant.
- **Langage théâtre** : Présence / Interprète nommable, zones jardin/cour, surfaces de sortie nommables.
- **Ombre Vivante** : silhouette, miroir, décrochage, autonomie contrôlée et danse avec l’interprète.
- **FX interactifs natifs** : Thread Curtain, Flow Field, Reaction Diffusion, Ribbon Trails, Metaballs/SDF, sable, swarm/boids, ripple, fluid warp, réfraction, point cloud, feedback.
- **Régie Companion** : pages Conduite / Son / Lumière / Vidéo / Plateau, swipe horizontal, faders/toggles, profils consoles, presets sobres.
- **Protocoles** : OSC, MIDI, Serial, Art-Net et **sACN/E1.31**.
- **ART → No-de** : cycle Remote Camera / retour vidéo WebRTC, RTT, reconnexion, FIRST_FRAME→LIVE et approche NDI honnête réutilisés/adaptés depuis notre code ART.

## Interfaces et rôles

No-de n'assigne jamais définitivement un appareil à un rôle.

- **Auto** : ordinateur → Designer ; téléphone/tablette → Mobile.
- **Designer** : interface complète.
- **Mobile** : interface compacte.
- **Régie** : Companion Studio éditable.
- **Plateau** : Companion directement en mode jeu.
- **Caméra** : Remote Camera WebRTC.

Depuis n'importe quelle interface, le sélecteur discret `Interface · … ▾` permet de changer de rôle immédiatement. Le choix manuel est mémorisé jusqu'au retour sur Auto. Cette règle vaut pour la PWA, Android et l'application Electron/macOS.

## Lancer le desktop

```bash
npm install
npm start
```

Paquet macOS Apple Silicon : `npm run dist:mac`  
Paquet Linux x64 : `npm run pack:linux`

## PWA

```bash
npm run build:pwa
npm run serve:pwa
```

URL publique :
https://cdriccarboni.github.io/no-de-vibe-designer-pwa/

## Android

```bash
npm run android:apk
npm run android:aab
```

APK de test courant :
https://cdriccarboni.github.io/no-de-vibe-designer-pwa/downloads/

Release 1.4.0 :
https://github.com/cdriccarboni/no-de-vibe-designer-pwa/releases/tag/v1.4.0

Rapport package/version/signature :
https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/android-verification.txt

Le build AAB Play refuse volontairement de produire un faux release si la vraie clé d’upload n’est pas configurée.

## Companion Studio

```bash
npm start
npm run serve:companion
```

Le Companion permet de piloter la conduite, le son, la lumière, la vidéo et le plateau depuis une tablette avec pages swipeables et layout personnalisable.

## Remote Camera / vidéo réseau

Desktop : Library → **Remote Camera**.

Le chemin vidéo est adapté de la logique ART : PeerJS/WebRTC direct, RTT, reconnexion et état LIVE seulement après première frame réelle.  
**NDI** reste un transport natif : un navigateur ne peut pas émettre du NDI directement. No-de expose donc un relais natif au lieu de simuler un état NDI.

## Validation production

```bash
npm run release:check
npm run test:pwa
```

`release:check` lance l’audit 105/105, les tests, les checks syntaxiques et le build PWA.
