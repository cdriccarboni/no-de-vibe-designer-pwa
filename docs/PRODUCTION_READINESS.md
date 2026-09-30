# No-de Vibe Designer — Production Readiness 1.2.0

Date : 2026-09-30  
Source canonique : `main`

## Couverture moteur

- **81/81 types de nodes de la Library ont des ports exécutables et un processeur réel.**
- Les nodes internes `box-in` / `box-out` complètent les sous-patchs.
- La Library démarre en mode Production ; le filtre Expérimental se masque automatiquement lorsqu’aucun type incomplet n’existe.
- `npm run audit:production` échoue si un node Library perd son processeur, si un nouveau type incomplet apparaît sans revue, ou si la couverture descend sous 81/81.

## Moteurs principaux

- Vidéo : caméra locale, Remote Camera, vidéo fichier, retour vidéo, mapping 2D, Shader Lab, Anaglyphe, Creative FX, Storm, Bending, Transmute, Ghost, Threshold, Mirror, Shadow, Body Clone, Composite, Transform.
- Génératif offline : Processing Garden / p5 subset, Sketch Lab, Dream Engine, Baleine, Blob, Trou noir.
- Audio : Audio Lab, filtre, delay, FFT, Organic Audio, niveau micro / mémo.
- Contrôle : MIDI, OSC, Art-Net/DMX, Control Surface, Input Mapper, Stage I/O.
- Serial : Arduino, ESP/Wemos, Servo, RFID/QR Serial, capteurs génériques.
- Passerelles OSC : TWOZERO, TD Tool, Isadora Tool, Chataigne, Millumin, TouchDesigner, Isadora, Max/MSP, Pure Data, SuperCollider.
- Projet : sous-patch, Show Importer, Automation, Data Lab, Universal Wire, Connectors.
- Mobile : caméras, micro, tactile, multitouch, gyroscope, accéléromètre, orientation, GPS, haptique, Wi‑Fi, Bluetooth.

## Sécurité de scène

Les nodes qui peuvent agir sur du matériel ou un logiciel externe sont **désarmés par défaut**.

- Arduino / ESP / Servo : aucun envoi à l’ajout du node.
- Bridges OSC : aucun envoi à l’ajout du node.
- Envoi uniquement par **Trigger** ou après activation explicite de **Envoi auto**.
- Le bouton PANIC coupe le moteur et les traitements audio prévus par le projet.
- Les erreurs du graphe restent visibles sans faux état « OK ».

## Processing / Sketch

Le moteur génératif est embarqué et offline. Pour rester déterministe et sûr en spectacle, il n’exécute pas de JavaScript arbitraire.

Sous-ensemble : `background()`, `fill()`, `circle()`, `rect()`, `line()`, `wave()`.

Variables : `width`, `height`, `time`, `frameCount`, `mouseX`, `mouseY`.

## Show Importer

Le node importe réellement :
- un projet `.cvd.json` en tant que source de cues ;
- ou un manifeste `{"name":"Spectacle","cues":[...]}`.

L’import est déclenché explicitement depuis l’inspecteur et peut ajouter ou remplacer les cues existants. Aucun ordre OSC/DMX n’est exécuté au moment de l’import.

## Diagnostic spectacle

Préférences → Moteurs / I/O → **Diagnostic spectacle**.

Le diagnostic expose sans secrets :
- version / plateforme ;
- erreurs récentes du graphe ;
- Remote Camera / WS ;
- MIDI / Serial ;
- disponibilité OSC UDP / Art-Net ;
- nodes non exécutables présents dans un ancien projet ;
- sorties externes armées en automatique.

## Gates de livraison

```bash
npm run audit:production
npm test
npm run check
npm run build:pwa
```

Commande complète :

```bash
npm run release:check
```

## Matériel réel à recetter avant une représentation critique

Le code peut être prêt sans prétendre qu’un périphérique non branché a été validé. Recette terrain requise pour :
- Remote Camera téléphone ↔ Mac et mesure de latence ;
- périphérique MIDI du spectacle ;
- Arduino / ESP / Servo / RFID et firmware utilisés ;
- OSC vers chaque logiciel tiers avec ses ports/adresses ;
- Art-Net vers l’interface ou node DMX réel ;
- installation/offline PWA ;
- AAB Play signé ;
- signature/notarisation macOS si distribution hors machine de régie.

## PLATFORM-LIMITED

- NDI Out : relais natif requis.
- Syphon / Spout : non annoncés comme moteurs actifs.
- Les logiciels tiers (TouchDesigner, Isadora, Millumin, Max, Pure Data, SuperCollider, Chataigne) ne sont pas embarqués : No-de fournit les moteurs de contrôle/export/OSC.
- GitHub Actions du dépôt échoue actuellement avant le premier step ; tant que l’infrastructure CI n’est pas rétablie, `release:check` exécuté localement reste le gate de référence.
