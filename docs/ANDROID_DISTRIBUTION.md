# Android — No-de Vibe Designer 1.3.0

Date : 2026-09-30

## Artefacts publics

Runtime Android construit depuis la PWA publique 1.3.0 via Capacitor 8.5.2.

- APK debug installable :
  https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/No-de-Vibe-Designer-1.3.0-debug.apk
- AAB non signé :
  https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/No-de-Vibe-Designer-1.3.0-unsigned.aab
- Rapport de vérification :
  https://raw.githubusercontent.com/cdriccarboni/no-de-vibe-designer-pwa/main/downloads/android-verification.txt

## Vérification réelle

- package : `fr.acousmatic.nodevibedesigner`
- versionCode : `130`
- versionName : `1.3.0`
- compile SDK : `36`
- min SDK : `24`
- target SDK : `36`
- signature APK : **v2 valide**
- signataire APK : certificat debug Android

L'APK debug est destiné au test direct sur téléphone/tablette.

## Google Play

L'AAB public est volontairement **non signé**. Il ne doit pas être envoyé tel quel au Play Store.

Le dépôt privé garde le pipeline de signature release :
- `NVD_UPLOAD_STORE_FILE`
- `NVD_UPLOAD_STORE_PASSWORD`
- `NVD_UPLOAD_KEY_ALIAS`
- `NVD_UPLOAD_KEY_PASSWORD`

Le script `scripts/prepare-upload-keystore.sh` refuse tout écrasement automatique d'une clé existante.

## Builder public

Le dépôt `no-de-vibe-designer-pwa` contient un workflow Android indépendant qui :
1. transforme les artefacts PWA en projet Capacitor ;
2. force la version 1.3.0 / code 130 ;
3. construit l'APK debug ;
4. vérifie le package/version/signature avec `aapt` et `apksigner` ;
5. construit l'AAB non signé ;
6. publie les binaires dans `downloads/`.

Le source Electron privé n'est jamais copié dans le dépôt public.
