# Android / Capacitor — No-de Vibe Designer

Le frontend Android est **le build PWA** (`dist/pwa`), pas une copie du code.
Même base fonctionnelle que desktop/PWA : Bureau + Plateau.

## Prérequis

- Android SDK (`~/Library/Android/sdk`)
- JDK 17+ : Android Studio JBR **ou** Homebrew `openjdk@17` / `openjdk@21`
  (le script positionne `JAVA_HOME` pour la session uniquement — pas de modification globale requise)

```bash
npm install
```

## Sync

```bash
npm run android:sync
```

Exécute `build:pwa` puis `npx cap sync android`.

## APK debug

```bash
npm run android:apk
```

Artefact : `android/app/build/outputs/apk/debug/app-debug.apk`

## APK release (non signé sans keystore)

```bash
npm run android:apk:release
```

Sans secrets de signature : `app-release-unsigned.apk`.

## Permissions

Internet, caméra, micro, vibration — déclarées dans le manifeste ; punch-hole / cutout via `windowLayoutInDisplayCutoutMode=shortEdges` + safe areas CSS (`viewport-fit=cover`).

## Capacité

OSC/Art-Net UDP restent côté hôte Electron. Sur Android : WebSocket + carte hôte / QR / dernier hôte.
