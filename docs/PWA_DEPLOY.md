# PWA Deploy — No-de Vibe Designer 1.3.0

Date : 2026-09-30 · Source : `main`

## Chaîne

| Étape | État | Notes |
|---|---|---|
| Code PWA | REAL | `mobile/` + `shared/` |
| Build | REAL | `npm run build:pwa` → `dist/pwa/` |
| Service Worker | REAL | cache versionné `nvd-1.3.0` |
| Dépôt public | REAL | `cdriccarboni/no-de-vibe-designer-pwa` |
| URL HTTPS | REAL | https://cdriccarboni.github.io/no-de-vibe-designer-pwa/ |
| Android webDir | REAL | même `dist/pwa` via Capacitor |
| Install téléphone | À recetter | doit être vérifié sur le téléphone de spectacle |
| Offline terrain | À recetter | shell offline présent ; recette longue nécessaire |

## Publication

Voie locale :

```bash
npm run deploy:pwa
```

Le script :
1. reconstruit `dist/pwa` ;
2. vérifie index / SW / manifest / build-info ;
3. pousse les artefacts dans le dépôt Pages public.

## GitHub Actions

`.github/workflows/deploy-pwa.yml` :
- build + tests ;
- artefact PWA ;
- Cloudflare Pages uniquement si les secrets existent.

GitHub interdit les secrets directement dans un `if:`. Le workflow 1.3.0 utilise donc les secrets en variables d'environnement puis conditionne uniquement l'étape de déploiement.

Si GitHub retourne `runner_id: 0` et aucune étape, le blocage vient du runner Actions et non du build applicatif.

## Cloudflare

Optionnel. Secrets :
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Sans eux, GitHub Pages reste l'URL publique de référence.

## ART

ART peut pointer vers l'URL publique No-de une fois l'installation téléphone recettée. Les deux projets restent séparés : ART fournit ses outils compagnie/régie, No-de son moteur nodal/Companion.

## Critère Done PWA

- URL publique répond ;
- `build-info.json` annonce 1.3.0 ;
- manifest standalone ;
- service worker actif ;
- installation sur téléphone ;
- relance offline validée.
