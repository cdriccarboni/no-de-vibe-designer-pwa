# Android — No-de Vibe Designer 1.4.0

Date : 2026-09-30

## Runtime

L'application Android est construite depuis la PWA publique multi-surface 1.4.0 via Capacitor 8.5.2.

Un téléphone ou une tablette démarre en **Mobile** par défaut, mais peut basculer à tout moment vers :
- Designer
- Mobile
- Régie
- Plateau
- Caméra

Le choix manuel est mémorisé. **Auto** restaure le choix par type d'appareil sans empêcher aucune interface.

## Artefacts

Release publique :
https://github.com/cdriccarboni/no-de-vibe-designer-pwa/releases/tag/v1.4.0

APK :
https://github.com/cdriccarboni/no-de-vibe-designer-pwa/releases/download/v1.4.0/No-de-Vibe-Designer-1.4.0-Android-debug.apk

AAB non signé :
https://github.com/cdriccarboni/no-de-vibe-designer-pwa/releases/download/v1.4.0/No-de-Vibe-Designer-1.4.0-unsigned.aab

## Vérification

- package : `fr.acousmatic.nodevibedesigner`
- versionName : `1.4.0`
- compile / target SDK : 36
- min SDK : 24
- APK debug : signature Android v2 vérifiée par `apksigner`
- AAB Play : uniquement publiable après signature avec la vraie clé d'upload

## Google Play

La publication Play reste conditionnée à :
- `PLAY_UPLOAD_KEYSTORE_B64`
- `PLAY_UPLOAD_STORE_PASSWORD`
- `PLAY_UPLOAD_KEY_ALIAS`
- `PLAY_UPLOAD_KEY_PASSWORD`
- `PLAY_SERVICE_ACCOUNT_JSON`

Aucune fausse clé ou AAB prétendument signé n'est généré.
