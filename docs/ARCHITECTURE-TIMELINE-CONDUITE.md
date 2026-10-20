# Architecture Timeline ↔ Conduite ↔ Nodes ↔ OSC ↔ Companion (état 3.3.20)

## Principe
Une seule source de vérité par responsabilité ; toutes les entrées passent par les mêmes portes.

```
 Bouton GO · Espace · panneau Conduite · OSC UDP (/nocode/cue/*) · Companion/téléphone (binding stage)
                                   │
                         shared/stage/go-controller.js        ← verrou double-GO, requestId, journal, pré-attente,
                                   │                             auto-continue/auto-follow, PANIC/STOP annulent
                   standby = project.meta.cuePlayheadId (cues.js)
                                   │
                    fireDesktopCue → applyCue (cues.js) → runtime (timeline, nodes) + effets OSC/Art-Net/sACN
                                   │
             autosave + publishHostState → pont LAN → téléphones (état), OSCQuery (arbre)
```

- **Présentation ≠ exécution** : `project.meta.cartouches` (libellés, couleurs, groupes, ordre affiché) n'est jamais lu par le moteur.
- **Horloge** : le runtime du Designer reste l'unique horloge de lecture ; les enchaînements de conduite utilisent des minuteurs
  annulables (pas de second moteur temporel).
- **Pas de boucle** : un GO enchaîné vérifie que la cue en attente n'a pas été déplacée entre-temps ; sinon il est journalisé « skip ».
- **Réseau** : aucune file de commandes pendant une coupure (le transport WebSocket n'accumule rien) ; un GO rejoué avec le même
  `requestId` est ignoré ; sans Designer ouvert, le pont refuse.

## Reste à faire (ordre)
1. Mobile et `bindings.js` (Companion hors pont) sur le même contrôleur (aujourd'hui : chemin Designer seulement).
2. Édition pre-wait / post-wait / mode d'enchaînement dans le panneau Conduite ; affichage du journal.
3. Cue → timeline : lancer une séquence nommée ; node → cue (sortie « déclencheur ») ; LISTEN OSCQuery pour l'état.
