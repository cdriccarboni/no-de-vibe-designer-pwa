# Publier une version de No[co]de Vibe Designer (PWA publique)

La PWA publique est servie par GitHub Pages depuis la branche `main` de ce dépôt (racine).
Fusionner sur `main` = publier. Tout se fait avec git, Node 22 et Playwright, sans outil propriétaire.

## 1. Incrémenter la version (toujours vers le haut)
Mettre la même version dans : `shared/version.js` (`APP_VERSION`), `build-info.json` (`version`, `cacheRevision`),
`sw.js` (`CACHE = "nvd-<version>-…"`, nouveau nom pour remplacer le cache des PWA installées),
`desktop/index.html` (badge `v<version>`), `install/index.html` (valeurs par défaut), `README.md`.
Ne pas toucher `.release-trigger` sauf pour lancer volontairement le workflow Release (builds natifs).

## 2. Vérifier en local
```bash
node qa/version-guard.mjs          # cohérence + jamais inférieure à la version publiée
node qa/privacy-guard.mjs          # aucune donnée privée
mkdir -p /tmp/pw && npm i --prefix /tmp/pw playwright && npx --prefix /tmp/pw playwright install chromium
PLAYWRIGHT_PATH=/tmp/pw/node_modules/playwright bash qa/run-all.sh
```
Sur Linux, les tests navigateur utilisent le Chromium de Playwright ; `CHROME=/chemin/vers/chrome` force un autre binaire
(sur Mac les tests prennent sinon `/Applications/Google Chrome.app`). Un test sans navigateur est listé « non exécuté », jamais compté comme réussi.

## 3. CI (`.github/workflows/runtime-qa.yml`, à chaque PR vers `main`)

> À appliquer une fois par un compte ayant le droit `workflow` : `git apply docs/ci/runtime-qa-steps.patch`
> (le jeton de l'agent n'a pas ce droit ; les étapes ci-dessous sont prêtes dans ce patch).

Syntaxe, invariants PWA, QA moteur, E2E Chrome, garde-fou de version, garde-fou de confidentialité,
scan de secrets (gitleaks), E2E responsive Playwright (375/390/430/768/1024/1440 px : clics réels Bureau/Plateau/Exemple).

## 4. Publier puis vérifier en ligne
Fusionner la PR sur `main`, attendre le déploiement Pages, puis :
```bash
curl -s https://cdriccarboni.github.io/no-de-vibe-designer-pwa/build-info.json   # version attendue
NVD_URL=https://cdriccarboni.github.io/no-de-vibe-designer-pwa/desktop/index.html \
  PLAYWRIGHT_PATH=/tmp/pw/node_modules/playwright node qa/responsive-modes-e2e.mjs
```
