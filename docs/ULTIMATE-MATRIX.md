# Matrice fonctionnelle Ultimate

Date : 2026-09-28 · branche `cursor/no-de-ultimate-20260928` · app **1.0.0**

Statuts : **PRESENT** · **PARTIAL** · **MISSING** · **PLATFORM-LIMITED** · **TESTED**

| Domaine | Fonction | Statut | Notes |
|---|---|---|---|
| Core | Graphe `cvd.graph` types/cycles | PRESENT / TESTED | |
| Core | Logic + blackhole/transform/composite/shadow | PRESENT / TESTED | |
| Core | Videofile play/pause/loop/seek/markers/syncGroup | PRESENT / TESTED | erreur sans fichier |
| Core | Sous-patch + wrap + ports dynamiques | PRESENT / TESTED | |
| Core | Migration format projet v1→v2 | PRESENT / TESTED | |
| Graphics | Pass graph + WebGL2 compile/FBO/upload | PRESENT / TESTED | pipeline GPU partiel hors Preview CPU |
| Stage | Cues GO / next / previous / panic | PRESENT / TESTED | desktop + mobile |
| Controller | Host card + QR + last-host | PRESENT / TESTED | |
| Controller | LAN UDP beacon | PRESENT / TESTED | |
| Controller | mDNS / Bonjour | PLATFORM-LIMITED | registre prêt ; LAN UDP + QR actifs |
| Devices | OSC WS + OSC UDP Electron | PRESENT / TESTED | |
| Devices | MIDI learn + Serial reconnect + Art-Net UDP | PRESENT / TESTED | |
| PWA | Bureau / Plateau | PRESENT / TESTED | Playwright 19/19 |
| Android | Capacitor sync | PRESENT | `npm run android:sync` |
| Android | APK debug / release-unsigned | PRESENT | `npm run android:apk` / `:release` |
| Android | Install + lancement device | PLATFORM-LIMITED | aucun adb device / émulateur |
| Audio | Filter / delay / FFT | PRESENT / TESTED | |
| Interop | Max / TD / PD / Millumin | PRESENT / TESTED | |
| Packaging | macOS `.app` arm64 | PRESENT | `dist/electron/mac-arm64/` |

## Vert pour 1.0 ?

Fonctions **annoncées et exécutables** : vertes ou PLATFORM-LIMITED documentées.  
APK build réel OK. Checkpoint `cursor/mobile-pwa-reprise-a257` = `a41faa8` intact.
