# Companion Studio — No-de Vibe Designer 1.2.0

Date : 2026-09-30 · Source canonique : `main`

## Fonctionnement actuel

Companion Studio transforme un téléphone ou une tablette en surface de régie personnalisable sur le LAN.

- Édition / Test / Plateau.
- Nom, texte secondaire, couleur, largeur et hauteur des widgets.
- Ajout / suppression de widgets.
- Sauvegarde Local First.
- Synchronisation **live** du layout téléphone/tablette ↔ desktop.
- Feedback bidirectionnel avec RTT réel du pont WebSocket.
- Détection automatique du Companion côté desktop.
- Mode Controller.
- **Monitor LAN réel** : preview du canvas desktop envoyé en JPEG compressé 480 px, cible 8 fps, via le pont WS existant.
- Le Monitor est démarré explicitement depuis le desktop ou demandé depuis le Studio, et peut être coupé depuis le Studio.

## Bindings réellement câblés

- Action / ping.
- Stage : GO / Prev / Next.
- Channel.
- OSC.
- Serial.
- MIDI.
- Caméra.
- Transport vidéo : play / pause / stop / toggle.

Les actions externes passent par les transports réels du desktop. Une absence de transport produit une erreur explicite.

## Monitor

Le Monitor WS privilégie la fiabilité et l’absence de dépendance supplémentaire. Il ne doit pas être présenté comme « zéro milliseconde ».

Le Studio affiche le RTT du transport ; la recette terrain doit vérifier la latence sur le Wi‑Fi réellement utilisé au spectacle.

Une optimisation WebRTC DataChannel / MediaStream pourra remplacer ou compléter ce flux plus tard sans modifier le schéma Companion.

## Démarrage

```bash
npm start
npm run serve:companion
```

Electron démarre déjà son pont hôte sur le port 4174. Le Studio est servi sur :

```
http://<IP-DU-MAC>:4177/studio/
```

Sur le téléphone, renseigner le pont :

```
ws://<IP-DU-MAC>:4174
```

## Remote Camera

Remote Camera reste un chemin PeerJS séparé du contrôle Companion. Cela évite de mélanger le flux caméra téléphone → Mac avec la surface de commandes.

## Limites terrain

À valider physiquement :
- RTT LAN sur le routeur de régie ;
- stabilité Monitor pendant une conduite longue ;
- comportements après perte/récupération Wi‑Fi ;
- bindings MIDI / Serial / OSC avec les vrais périphériques ;
- Remote Camera sur le téléphone réellement utilisé.

USB Companion et WebRTC Studio restent des optimisations de transport, pas des prérequis au fonctionnement LAN actuel.
