# PWA Deploy Status — honest

Date: 2026-09-29 · Branch `cursor/no-de-2.2-reprise-20260929` · App still **1.1.0**

## Chain

| Step | Status | Notes |
|---|---|---|
| PWA **code** | REAL | `mobile/` + `npm run build:pwa` → `dist/pwa/` |
| PWA **build** | REAL | `build-info.json`, manifest, SW, icons |
| PWA **deploy** | REAL | Public publish repo `cdriccarboni/no-de-vibe-designer-pwa` (source repo is **private** → GitHub Pages unavailable there) |
| PWA **public URL** | REAL | https://cdriccarboni.github.io/no-de-vibe-designer-pwa/ |
| Phone **install** | UNTESTED on device | Desktop browser: HTTPS + manifest `standalone` + SW controlling verified |
| Offline **prod** | PARTIAL | SW caches shell; full offline field proof pending phone |

## How to redeploy

```bash
npm run deploy:pwa   # build + push artifacts to publish repo
```

Cloudflare Pages (ART pattern) is ready in `.github/workflows/deploy-pwa.yml` but needs repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` — until then, GitHub Pages publish repo is the public HTTPS path.

## ART wiring

`NEXT_PUBLIC_NO_DE_VIBE_DESIGNER_PWA_URL` must point at the URL above **only after** phone install is confirmed. Do not claim ART→No-de Done until ART rebuild with that env is verified.

## Not “in PWA” until

Phone can open the public URL and install standalone. Until then: code+build+deploy+URL are real; install/offline-prod are not Done.
