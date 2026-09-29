# Android / PWA

La cible actuelle est la PWA, pas une copie responsive du desktop.

## Construire

```bash
npm run build:pwa
```

Sortie : `dist/pwa/`. C’est ce dossier qu’un futur projet Capacitor doit utiliser comme `webDir`. Ne pas dupliquer `shared/` dans l’application Android.

Servir en local (pas d’hébergement public) :

```bash
npm run serve:pwa
```

## Interface

- **Bureau** : projet, nodes, câbles, paramètres, Vibe, timeline, enregistrement.
- **Plateau** : GO, cues, Preview, retour vers l’édition.

Les capteurs (caméra avant/arrière, micro, tactile, gyroscope, accéléromètre, orientation, GPS, vibration, réseau, Bluetooth) sont des nodes du moteur partagé. Si l’API n’existe pas, le node affiche l’indisponibilité. Il n’invente pas de mesure.

## Capacitor

Pas encore branché. Quand il le sera : envelopper `dist/pwa`, garder le pont WebSocket pour le bureau distant, et retester les permissions Android (caméra, micro, mouvement) sur un appareil réel.
