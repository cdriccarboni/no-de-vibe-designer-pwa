# Divergence Git — No-de Vibe Designer

Date : 2026-09-27

## Deux lignes incompatibles

| Ligne | Branche / ref | Contenu | Version affichée |
|---|---|---|---|
| **Production actuelle (P00/P01+)** | `cursor/no-de-finalisation-20260927` | `desktop/` + `shared/` + packaging web/Electron | **0.9.x** |
| **Histoire parallèle** | `origin/main` | Electron `app/`, Graph IR v2, CI | **0.8.0** |

- **Pas d’ancêtre commun** (`git merge-base` échoue).
- **Ne pas** fusionner avec `--allow-unrelated-histories`.
- **Ne pas** remplacer `main` par force-push.

## Proposition de consolidation réversible

1. Garder `cursor/no-de-finalisation-20260927` comme ligne de livraison testable.
2. Archiver `origin/main` sous un tag read-only, ex. `archive/electron-app-0.8.0-unrelated`.
3. Plus tard, extraire manuellement les briques utiles de `app/shared/` (exporters, nested graph) vers `shared/` de la ligne 0.9.x, commit par commit.
4. Seulement alors, ouvrir une PR vers `main` **après** reset documenté / orphan branch — décision humaine explicite.

## Statut push

Branche dédiée poussée ; SHA local = SHA distant pour `cursor/no-de-finalisation-20260927`.
