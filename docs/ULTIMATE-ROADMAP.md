# Roadmap Ultimate — No-de Vibe Designer

Base : `a41faa8` (0.10.1) · branche `cursor/no-de-ultimate-20260928`  
Checkpoint 0.10.1 / PR #3 : **intact**, non écrasé.

## Progression de versions

| Version | Thème | Statut |
|---|---|---|
| 0.10.1 | PWA + WebSocket RFC | gelée (`cursor/mobile-pwa-reprise-a257`) |
| 0.11.0 | Core + nodes hérités | fait |
| 0.12.0 | Graphics / Stage / host card | fait |
| 0.13.0 | Art-Net / MIDI learn / audio / Android scaffold | fait |
| 0.14.0 | Shadow / PD / Serial reconnect / LAN beacon / Stage GO | fait |
| 0.15.0 | FFT / videofile seek / WebGL2 upload / preuves packaging | fait |
| 1.0.0 | Matrice verte (PLATFORM-LIMITED documentés OK) | fait |

## Lots A–J

A Core ✓ · B Graphics ✓ · C Audio ✓ · D Devices ✓ · E Controllers ✓ (mDNS PL) · F PWA ✓ · G Android sync ✓ / APK PL · H Stage ✓ · I Interop ✓ · J QA ✓

## Règles
- Un seul cœur `shared/`
- Node affiché opérationnel ⇒ processeur réel
- Impossible ⇒ message explicite, jamais succès simulé
- Pas de redesign UX VIBE · PATCH · STAGE
- Pas de force-push / reset destructif / écrasement 0.10.1
