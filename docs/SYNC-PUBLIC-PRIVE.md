# Synchronisation bidirectionnelle contrôlée (socle commun ↔ version privée)

Le dépôt public est le **socle commun**. La version privée est un laboratoire qui le consomme et l'enrichit.

## PUBLIC → PRIVÉ (automatisable)
Après validation sur le public : fusion du `main` public dans une branche de sync privée, les chemins privés
(`.private-overrides`) gagnent toujours, tests puis PR privée. Si les Actions privées sont indisponibles :
script local documenté (`scripts/private/sync-from-public.sh`, jamais d'envoi vers le public).

## PRIVÉ → PUBLIC (manuel, jamais de fusion aveugle)
1. Lister les candidats (lecture seule) : `scripts/private/list-generic-candidates.sh`.
2. Revue : le fichier est-il générique ? aucun nom/contenu/réglage de spectacle, secret, donnée personnelle, ressource sous licence restrictive ?
3. Réécrire les tests avec des données neutres (ne pas copier les tests du spectacle).
4. Branche dédiée depuis `main` public, `qa/privacy-guard.mjs` + tests, PR documentée, puis re-sync PUBLIC→PRIVÉ.

## Exceptions (jamais publiées)
Secrets, clés, données personnelles, documents confidentiels, ressources artistiques privées, configurations de spectacle, contenus non destinés à la publication, éléments à licence non redistribuable.

## Parité
Toute fonctionnalité publique doit passer les tests de la version privée (`scripts/private/run-tests.sh`) ; toute fonctionnalité générique privée doit être proposée au public. Différences autorisées : configurations, modules spécifiques, presets/ressources privés, variables d'environnement.

## Dernier transfert PRIVÉ → PUBLIC
`shared/stage/cartouches.js` (présentation de conduite : libellé, couleur, page, notes, groupe, favori, ordre, annuler/rétablir, import/export versionné) + `qa/cartouches-qa.mjs` (13 contrôles, données neutres).
