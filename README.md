# No-de Vibe Designer — public PWA

No-de Vibe Designer est une PWA multi-interface pour la régie et la création visuelle : Designer, Mobile, Régie, Plateau et Remote Camera.

- PWA publique : https://cdriccarboni.github.io/no-de-vibe-designer-pwa/
- Version : 1.3.2
- Package Android : `fr.acousmatic.nodevibedesigner`
- versionCode Android : calculé automatiquement depuis la version
- Target Android : API 36
- Source de build : `build-info.json`

## Android

### Test direct

- Page de téléchargement : https://cdriccarboni.github.io/no-de-vibe-designer-pwa/downloads/
- APK de test : `downloads/No-de-Vibe-Designer-latest-debug.apk`
- Vérification APK : `downloads/android-verification.txt`

L'APK public sert uniquement aux tests directs. La distribution Google Play utilise un **AAB release signé avec la clé d'upload Play**, généré par GitHub Actions sans publier la clé dans le dépôt.

### Google Play

Le workflow `.github/workflows/android-build.yml` produit :

1. un APK debug pour les tests directs ;
2. un AAB de contrôle non signé ;
3. un AAB Play signé si les secrets de signature sont configurés ;
4. une publication optionnelle vers les canaux `internal`, `alpha` ou `beta`.

Les instructions de finalisation sont dans `play/README.md`.

## Confidentialité

La politique de confidentialité publique est disponible ici :

https://cdriccarboni.github.io/no-de-vibe-designer-pwa/privacy/
