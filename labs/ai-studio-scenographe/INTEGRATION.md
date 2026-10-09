# Lab Google AI Studio — Scénographe (candidat 01)

Source : `cdriccarboni/nocode-ai-expert@0fa4445` (historique conservé par merge `-s ours`).
Stack : React 19 / Vite 8 / TypeScript. **Isolé** : aucun fichier de la PWA officielle (vanilla JS) n'est modifié ; pas déployé sur Pages, pas inclus dans `sw.js` ni dans les APK/DMG.

Validation (Node 24) : `npm install --legacy-peer-deps && npm run lint && npm run build` → OK.
Limite connue : `npm install` sans `--legacy-peer-deps` échoue (ERESOLVE : `esbuild ^0.25` vs `vite@8` qui exige `^0.27 || ^0.28`).
Le workflow `.github/workflows/no-de-integration.yml` du dépôt d'origine n'est pas repris.
Le portage des moteurs vers les surfaces officielles (timeline, Library, inspecteur) reste à faire, module par module.
