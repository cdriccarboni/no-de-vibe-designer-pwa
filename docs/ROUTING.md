# Routage par piste / layer — V0.6

Chaque piste de timeline possède un routage indépendant enregistré dans le `.cvd.json`.

Modes :
- **Principal** : piste rendue vers OUTPUT principal.
- **Uniquement vers…** : piste exclue du principal et routée seulement vers les destinations choisies.
- **Copie vers…** : piste continue vers OUTPUT principal et est dupliquée vers une ou plusieurs destinations.

Destinations modélisées :
- OUTPUT principal
- OUTPUT secondaire
- Millumin
- TouchDesigner
- OBS
- Chataigne
- NDI
- Syphon (macOS)
- Spout (Windows)
- OSC / Trigger

Important :
- OUTPUT local et modèle de routage sont déjà fonctionnels.
- NDI/Syphon/Spout nécessitent des adaptateurs natifs : ils sont volontairement marqués comme adaptateurs et ne sont pas prétendus actifs dans cette version web.
- Le format est conçu pour que les backends desktop natifs futurs puissent implémenter ces sorties sans modifier les projets.
