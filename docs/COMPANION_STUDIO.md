# Companion Studio — No-de Vibe Designer 1.3.0

Date : 2026-09-30 · Source canonique : `main`

## Principe

Companion Studio transforme téléphone ou tablette en **surface de régie personnalisable**. L'objectif n'est pas de reproduire une grosse console, mais de donner à une petite compagnie la totalité utile du spectacle sous la main avec une UX sobre.

## Navigation

Pages fonctionnelles :
- Conduite
- Son
- Lumière
- Vidéo
- Plateau

Navigation par tabs ou **swipe horizontal**. Le layout est éditable, sauvegardé Local First et synchronisable avec le desktop.

## Widgets

- Button
- Momentary
- Toggle
- Fader
- Cue light / état
- Network state

Chaque widget peut porter :
- nom ;
- texte secondaire ;
- couleur ;
- taille ;
- binding ;
- destination/protocole.

## Régie universelle

Les profils matériel/logiciel sont séparés des presets de page.

Profils prévus/présents : ETC Eos, ChamSys MagicQ, grandMA3, QLab, Millumin, Resolume, Behringer X32/M32, X Air/XR, Yamaha, Allen & Heath, OSC et DMX réseau génériques.

Protocoles :
- OSC
- MIDI
- MIDI Show Control
- Art-Net
- sACN / E1.31
- DMX via Art-Net/sACN/interface
- Serial
- WebSocket
- WebRTC pour les flux vidéo
- NDI via relais natif

Une fiche profil ne prétend pas émuler une console : elle génère des commandes éditables au-dessus des transports disponibles.

## Presets

Les presets restent volontairement peu nombreux et fonctionnels. Ils servent de point de départ rapide, puis restent entièrement éditables.

## Monitor / vidéo

Le contrôle Companion et les flux vidéo restent séparés.

Le retour vidéo réutilise la logique terrain ART :
- WebRTC direct prioritaire ;
- RTT ;
- reconnexion ;
- état LIVE après première frame ;
- fallback possible vers un monitor plus léger selon la surface.

Le monitor ne doit jamais être présenté comme « zéro milliseconde » sans mesure terrain.

## Bindings réels

- Stage / conduite ;
- Channel ;
- OSC ;
- MIDI ;
- Serial ;
- Art-Net ;
- sACN ;
- Caméra ;
- Transport vidéo.

Une absence de transport produit une erreur explicite.

## Démarrage

```bash
npm start
npm run serve:companion
```

Hôte WebSocket par défaut : `4174`.  
Studio local : `http://<IP-DU-MAC>:4177/studio/`.

## Recette terrain

À valider :
- RTT LAN ;
- stabilité sur une conduite longue ;
- swipe / touch sur tablette ;
- reconnexion Wi-Fi ;
- profils consoles réellement utilisés ;
- Art-Net / sACN avec le réseau lumière ;
- Remote Camera / monitor avec les téléphones du spectacle.
