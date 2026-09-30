# No-de Vibe Designer — Production Readiness 1.4.0

Date : 2026-09-30  
Source canonique : `main`

## Couverture moteur

- **105/105 types de nodes de la Library ont des ports exécutables et un processeur réel.**
- Les nodes internes `box-in` / `box-out` complètent les sous-patchs.
- `npm run audit:production` échoue si un node Library perd son processeur, si un type incomplet apparaît ou si la couverture descend sous 105/105.
- La Library ne doit plus afficher de faux `＋` sans moteur.

## Moteurs théâtre / interaction

- **Présence / Interprète** : identité nommable, source vidéo, activité et position scénique.
- **Ombre Vivante** : silhouette, jardin/cour, miroir, décrochage mémorisé, rattachement et autonomie organique.
- Sorties scéniques nommables : rideau de fils, cyclo, écran, tulle, sol, etc.
- Langage naturel : le Planner peut transformer une description de scène en patch lisible et nommé.

## Moteurs visuels

Vidéo / FX :
- caméra locale, Remote Camera, fichier vidéo, retour vidéo, mapping, Stage Output ;
- Threshold, Depth/Silhouette Mask, Optical Flow, Ghost, Feedback, Mirror, Shadow, Body Clone ;
- Fluid Warp, Refraction/Glass, Point Cloud Depth, Composite, Transform ;
- Shader Lab, Anaglyphe, Creative FX, Storm, Bending, Transmute.

Interactif / génératif offline :
- Thread Curtain ;
- Flow Field / particules ;
- Reaction Diffusion ;
- Ribbon Trails ;
- Metaballs / SDF ;
- Interactive Sand ;
- Swarm / Boids ;
- Ripple Field ;
- Baleine, Blob, Trou noir ;
- Processing Garden / p5 subset, Sketch Lab, Dream Engine.

## Audio / contrôle / devices

- Audio Lab, filtre, delay, FFT, Organic Audio, mémo sonore.
- MIDI, OSC, Control Surface, Input Mapper, Stage I/O.
- Art-Net / DMX.
- **sACN / E1.31** natif via bridge Electron/Node.
- Arduino, ESP/Wemos, Servo, RFID/QR Serial, capteurs.
- Mobile : caméras, micro, tactile, multitouch, gyro, accéléromètre, orientation, GPS, haptique, Wi-Fi, Bluetooth.

## Companion Régie

Companion Studio fournit une régie tablette sobre et personnalisable :

- pages **Conduite / Son / Lumière / Vidéo / Plateau** ;
- swipe horizontal ;
- button / momentary / toggle / fader ;
- sauvegarde Local First et synchronisation live ;
- feedback réseau ;
- profils consoles/logicielles ;
- presets fonctionnels compacts ;
- OSC / MIDI / Serial / Art-Net / sACN ;
- transport vidéo/monitor séparé des commandes.

Les profils consoles sont des recettes au-dessus des protocoles réels : No-de ne simule pas une compatibilité non vérifiée.

## IA locale / Vibe

Architecture local-first :

1. Ollama local via Electron ;
2. modèle par défaut `qwen2.5-coder:7b` ;
3. sortie structurée en opérations JSON ;
4. **Planner déterministe** capable de construire des patches sans modèle ;
5. **Safety Engine** indépendant avant preview puis avant Apply ;
6. Undo disponible ;
7. cloud distant uniquement en secours explicite.

Sécurité :
- l’IA ne peut pas armer automatiquement les sorties Serial / Servo / OSC / DMX ;
- aucune permission caméra/micro n’est accordée automatiquement ;
- nombre d’opérations et nouveaux nodes bornés ;
- connexions incompatibles filtrées.

## ART → No-de

Briques reprises/adaptées depuis notre code ART :

- cycle Remote Camera / retour vidéo PeerJS-WebRTC ;
- reconnexion ;
- RTT par data channel ;
- état LIVE uniquement après première frame réelle ;
- séparation contrôle / média ;
- approche NDI honnête : navigateur = pas d’émission NDI native.

### NDI

Le node NDI est **PLATFORM-LIMITED** tant que le relais natif n’est pas présent.  
No-de ne revendique jamais un faux flux NDI. La cible produit est : vidéo No-de → relais natif local → NDI réseau.

## Sécurité de scène

Les actions externes sont désarmées par défaut :

- Arduino / ESP / Servo : aucun ordre à l’ajout.
- Bridges OSC : aucun envoi à l’ajout.
- Companion : les actions partent uniquement lors d’une interaction explicite.
- PANIC / STOP restent accessibles.
- erreurs et transports absents remontent comme erreurs réelles.

## Diagnostic spectacle

Préférences → Moteurs / I/O → **Diagnostic spectacle**.

Il expose sans secrets :
- version / plateforme ;
- erreurs du graphe ;
- Remote Camera / Companion ;
- MIDI / Serial ;
- OSC / Art-Net / sACN disponibles ;
- sorties externes éventuellement armées.

## Gates de livraison

```bash
npm run audit:production
npm test
npm run check
npm run build:pwa
npm run release:check
```

## Cibles de distribution

- macOS Apple Silicon / Electron ;
- Linux x64 / Electron ;
- PWA HTTPS téléphone/tablette ;
- Android APK ;
- Android AAB Play lorsque la vraie clé d’upload est fournie.

## Recette terrain requise

Un build logiciel ne remplace pas une recette matérielle. À valider physiquement avant une représentation critique :

- téléphone ↔ Mac Remote Camera et latence réelle ;
- réseau Companion long terme / perte puis reprise Wi-Fi ;
- périphériques MIDI ;
- Arduino / ESP / Servo / RFID + firmware ;
- OSC vers chaque logiciel tiers ;
- Art-Net / sACN vers le réseau lumière réel ;
- relais NDI natif ;
- installation/offline PWA ;
- AAB signé ;
- signature/notarisation macOS pour distribution large.

## Infrastructure CI

Les workflows sont configurés pour PWA, macOS et builds multiplateformes. Si GitHub ne fournit aucun runner (`runner_id: 0`), le blocage est infrastructurel et non un résultat de test. La publication PWA peut être réalisée directement vers le dépôt public en attendant.


## Validation publique 1.3.0

État vérifié le 2026-09-30 :

- PWA GitHub Pages : **success**
- Runtime QA public : **success**
- syntaxe `mobile.js` + tous les `shared/*.js` : **success**
- Library : **105/105**
- phrase de scène Maxime → Ombre Vivante → Rideau de fils : **success**
- Ombre Vivante miroir + autonome : **success**
- Thread Curtain : **success**
- sACN/E1.31 : **success**
- Safety Engine : **success**
- 5 presets Companion : **success**
- APK Android 1.3.0 (130) : **build success**
- signature APK v2 : **verified**
- AAB non signé : **build success**

APK public :
https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/No-de-Vibe-Designer-1.3.0-debug.apk

Rapport Android :
https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/android-verification.txt

Le desktop Electron Mac/Linux reste séparé du dépôt public afin de ne pas exposer le source privé.


## Validation publique 1.3.1

- PWA GitHub Pages multi-surface : **success**
- Runtime QA 1.3.1 : **success**
- Designer / Mobile / Régie / Plateau / Caméra : **présents et validés**
- bascule universelle : **validée**
- cache : `nvd-1.3.1-multi`
- APK Android 1.3.1 (131) : **build success**
- signature APK v2 : **verified**
- AAB 1.3.1 non signé : **build success**

APK :
https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/No-de-Vibe-Designer-1.3.1-debug.apk

## Validation 1.4.0 — 2026-09-30

- Source canonique privé : `main` 1.4.0.
- Runtime QA public : **SUCCESS** (syntaxe, invariants PWA, 105/105 moteurs, Companion, Shader Lab, Plug & Play).
- PWA publique : dépôt `no-de-vibe-designer-pwa`, cache `nvd-1.4.0-multi`.
- Companion Device Editor : modale contextuelle intégrée au Designer ; moteur Companion Local First conservé.
- Shader Lab : double-clic, édition GLSL, compilation avant Apply, cache de programmes.
- Plug & Play : détection caméra passive sans permission automatique.
- Distribution binaire : release publique GitHub produit APK Android + macOS ARM64 ; Google Play reste conditionné aux secrets d'upload et au compte de service.

### CI canonique

Les workflows automatiques du dépôt privé sont désormais manuels car GitHub n'y attribue actuellement aucun runner (jobs à 0 étape). La validation automatisée réelle et la distribution sont exécutées sur le dépôt public, sans exposer le source privé.
