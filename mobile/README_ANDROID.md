# Android / Mobile

Ce dossier prépare l'application Android sans transformer l'interface desktop en responsive.

## Principe
Même `shared/` :
- IR de projet `.cvd.json`
- runtime
- catalogue de nodes
- moteurs communs

Interface mobile indépendante :
- écrans successifs
- navigation basse
- node editor tactile avec pan/zoom
- vues outils plein écran / bottom sheets
- Stage rapide à une main
- Vibe simplifié
- accès aux capteurs du téléphone

## Capacités téléphone prévues comme nodes
- caméra avant/arrière
- micro
- tactile / multitouch
- gyroscope
- accéléromètre
- orientation
- GPS
- vibration/haptique
- Wi-Fi
- Bluetooth

## Packaging Android
Le prochain jalon sera d'envelopper `mobile/` avec Capacitor/Android ou une enveloppe native équivalente après stabilisation du socle partagé.
Ne pas dupliquer le moteur dans le projet Android.
