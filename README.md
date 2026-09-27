# No-de Vibe Designer 0.9.3

Environnement de patch nodal pour la création et l’exploitation scène (macOS Apple Silicon).

## Lancer

### Application autonome (recommandé)
```bash
./packaging/mac/BUILD-Electron-No-de-Vibe-Designer.command
open "dist/electron/mac-arm64/No-de Vibe Designer.app"
```
Chromium est embarqué via Electron — **pas besoin** de Chrome installé.

### Développement web
```bash
./LANCER-No-de-Vibe-Designer.command
```
→ `http://127.0.0.1:4173/desktop/`

## Tests
```bash
npm test
# ou
node tests/run.mjs
```

## Fonctions 0.9.3
- Patch exécutable : caméra → shader → Preview/OUTPUT
- Sous-patches (édition, save/restore)
- Audio Web Audio (tone / micro niveau)
- Vibe : Entrée → aperçu → appliquer / annuler (Undo)
- MIDI/OSC/Serial via bus patch (matériel à vérifier)
- Exclusion Grok/xAI

## Signature
Les builds sont **non notarisés** (`identity: null`, signature ad hoc). Sur macOS : clic droit → Ouvrir si Gatekeeper bloque.

## Historique Git
Voir `docs/GIT_DIVERGENCE.md` — ne pas fusionner avec `origin/main` (histoire sans ancêtre commun).
