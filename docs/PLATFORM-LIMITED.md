# Preuves de plateforme — limites honnêtes

Date : 2026-09-28 · app **1.0.0** · branche `cursor/no-de-ultimate-20260928`

| Artefact | Statut | Preuve |
|---|---|---|
| `npm test` | OK | suite unitaire |
| `npm run check` | OK | syntaxe Electron/desktop/mobile/bridge/shared |
| Playwright PWA | OK | 19/19 |
| Capacitor `android/` | PRESENT | `npm run android:sync` |
| APK debug | **OK** | `android/app/build/outputs/apk/debug/app-debug.apk` via `npm run android:apk` (JDK Homebrew openjdk@21, session-only `JAVA_HOME`) |
| APK release unsigned | **OK** | `android/app/build/outputs/apk/release/app-release-unsigned.apk` (pas de keystore secrets) |
| Lancement APK sur appareil/émulateur | **PLATFORM-LIMITED** | aucun device `adb` ni image système émulateur sur cette machine |
| mDNS / Bonjour | **PLATFORM-LIMITED** | balise LAN UDP + QR + `/nvd-host.json` ; registre extensible (`shared/discovery/registry.js`) sans faux succès |
| macOS `.app` | OK | `dist/electron/mac-arm64/No-de Vibe Designer.app` |

Ces limites sont documentées, pas simulées en succès.
