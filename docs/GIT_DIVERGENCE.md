# Histoire Git — No-de Vibe Designer

Date : 2026-09-27

## Source canonique

Cet arbre (`desktop/` + `shared/` + Electron, **0.9.4**) est la source canonique.

| Ref | Commit | Rôle |
|---|---|---|
| Branche de consolidation | tête 0.9.4 | arbre à livrer |
| `main` historique | `110a59f9b4` (0.8.0) | ancêtre conservé, pas le contenu à livrer |
| `archive/main-0.8.0` | `110a59f9b4` | branche archive additive |
| `archive/main-0.8.0-110a59f` | `110a59f9b4` | tag archive |

Les deux lignes n’ont pas d’ancêtre de contenu commun. L’archive garde la ligne 0.8.0 telle quelle (CI arm64 d’origine, Graph IR v2, tests `test/core.test.mjs`).

## Jointure prévue

La PR vers `main` contient un merge `--allow-unrelated-histories -s ours` fait **depuis cet arbre** : le résultat a le contenu 0.9.4 et `main` comme second parent. `main` peut alors avancer en fast-forward. Pas de force-push, pas d’écrasement de `main` depuis ici.

```bash
git checkout main
git merge --ff-only <branche-de-consolidation>
```
