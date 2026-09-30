# No-de Vibe Designer 1.3.1 — état de release

Date : 2026-09-30

## Correctif principal

La PWA 1.3.0 publiait uniquement le shell mobile à la racine.  
La 1.3.1 devient une **PWA multi-surface** :

- Designer — interface complète ;
- Mobile — interface compacte ;
- Régie — Companion Studio ;
- Plateau — Companion Studio directement en jeu ;
- Caméra — Remote Camera WebRTC.

## Règle d’architecture

Le type d’appareil ne verrouille jamais son rôle.

- ordinateur peut devenir Régie, Plateau, Mobile ou Caméra ;
- téléphone/tablette peut ouvrir Designer si souhaité ;
- deuxième ordinateur peut servir de télécommande ;
- chaque surface contient un sélecteur discret ;
- le choix manuel est mémorisé ;
- Auto supprime cette préférence et revient au routage par défaut.

## Routage Auto

- ordinateur → Designer ;
- téléphone/tablette → Mobile.

URLs explicites :
- `/desktop/?surface=designer`
- `/mobile/?surface=mobile`
- `/studio/?surface=regie`
- `/studio/?surface=plateau`
- `/companion/?surface=camera`

## Cache / offline

Service worker racine : `nvd-1.3.1-multi`.

Il conserve séparément les navigations des différentes surfaces et ne remplace plus la racine par la dernière page visitée.

## Android

- versionCode : 131
- versionName : 1.3.1
- le runtime Android embarque la même PWA multi-surface.

## Moteur

Les acquis 1.3.0 restent inchangés :
- 105/105 nodes exécutables ;
- Planner théâtre ;
- Ombre Vivante ;
- Thread Curtain et moteurs interactifs ;
- Companion régie ;
- Art-Net / sACN ;
- Safety Engine.
