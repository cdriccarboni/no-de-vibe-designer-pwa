# No-de Vibe Designer — public PWA

No-de Vibe Designer est une PWA multi-interface pour la régie et la création visuelle : Designer, Mobile, Régie, Plateau et Remote Camera.

- PWA publique : https://cdriccarboni.github.io/no-de-vibe-designer-pwa/
- Version : 3.1.0
- Package Android : `fr.acousmatic.nodevibedesigner`
- versionCode Android : calculé automatiquement depuis la version
- Target Android : API 36
- Source de build : `build-info.json`

## V3.1.0

- Graphics Engine V3 : WebGPU / WebGL2 / CPU.
- SuperNodes V3 : Digital Curtain, Living Shadow, Feedback Dream, Particle Field, Quick Map.
- Quick Map téléphone avec mapping projectif réel.
- Image → Vibe : photo/dessin vers Auto, p5/Canvas, GLSL, Particules ou SDF.
- Manuel novice-first : première régie en 10 minutes.\n- ML temps réel : ml5 Main/Corps et Brain.js Mapping réellement exécutables.

### Agents locaux

- Scan automatique des modèles Ollama.
- Rôles Code, Vision, Rapide, Chat, Embedding et Utilitaire.
- Routage Vibe automatique selon la tâche.
- Gestion compacte dans Préférences → IA.

## Android

### Test direct

- Page de téléchargement stable : https://cdriccarboni.github.io/no-de-vibe-designer-pwa/downloads/
- Les APK et builds macOS (DMG + ZIP Apple Silicon) sont attachés à la dernière GitHub Release ; la page stable redirige toujours vers les derniers artefacts.

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
