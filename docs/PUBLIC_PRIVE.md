# No[co]de Vibe Designer — version publique et versions privées

Ce dépôt est la **version publique** : moteur, objets, générateurs, interfaces et
démonstrations **génériques**. Il ne contient aucune donnée de spectacle.

## Ce qui ne doit jamais entrer ici

- conduites, tops, didascalies, noms de scènes, de personnages ou de comédiens ;
- documents artistiques (PDF de conduite, manuscrits, captures de répétition) ;
- réglages propres à un spectacle ;
- clés, jetons, secrets, fichiers de session d'agents.

Le contrôle `qa/privacy-guard.mjs` le vérifie automatiquement (workflow
« Garde-fou confidentialité ») sur chaque pull request, sur `main` et avant
chaque build public (Android, macOS, release). Les termes privés y sont stockés
sous forme d'empreintes SHA-256 salées, jamais en clair.

## Points d'extension prévus pour une version privée

Une version privée (dépôt **privé** distinct, jamais une branche de ce dépôt)
remplace uniquement ces fichiers, que la synchronisation conserve toujours :

| Fichier public (générique) | Rôle |
|---|---|
| `shared/scenic/scenic-pack.js` | pack scénique de démonstration de la timeline |
| `shared/live-title-presets.js` | titres diffusables depuis la régie Show |

Le lab Scénographe (AI Studio) n'est pas publié ici. Pour régénérer un pack depuis
un lab, dans le dépôt privé uniquement :
`NVD_LAB_DIR=/chemin/du/lab node scripts/import-ai-studio-library.mjs`.

## Flux de mise à jour

- **Public → privé** : automatique (workflow du dépôt privé) — fusion de `main`,
  tests, puis PR privée ; les fichiers d'extension privés sont toujours conservés ;
  en cas de conflit, une PR privée signale le blocage.
- **Privé → public** : jamais automatique. Seules des améliorations génériques
  peuvent être proposées, par PR, après le garde-fou et une validation explicite.

Un dépôt privé porte le marqueur `.nocode-private` ; les workflows publics
refusent tout contenu qui le contient.
