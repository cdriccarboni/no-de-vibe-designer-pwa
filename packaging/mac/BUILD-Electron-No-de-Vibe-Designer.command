#!/bin/zsh
# Build No-de Vibe Designer.app autonome (Electron Chromium embarqué, Apple Silicon).
# Usage: ./packaging/mac/BUILD-Electron-No-de-Vibe-Designer.command
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMMIT=$(git rev-parse --short HEAD)
# Injecter le commit source
python3 - <<PY
from pathlib import Path
p = Path("shared/version.js")
t = p.read_text()
import re
t = re.sub(r'export const SOURCE_COMMIT = "[^"]*";', f'export const SOURCE_COMMIT = "{ "$COMMIT" }";', t)
p.write_text(t)
print("SOURCE_COMMIT =", "$COMMIT")
PY

if [[ ! -d node_modules/electron ]]; then
  npm install
  npm install-scripts approve electron || true
  node node_modules/electron/install.js || true
fi

echo "→ electron-builder arm64 (dir + zip)"
npx electron-builder --mac dir zip --arm64

APP=$(find dist/electron -maxdepth 3 -type d -name "No-de Vibe Designer.app" | head -1)
echo "✓ App : $APP"
echo "  Lancer : open \"$APP\""
ZIP=$(find dist/electron -maxdepth 2 -name "*.zip" | head -1 || true)
if [[ -n "${ZIP:-}" ]]; then
  DEST="dist/No-de-Vibe-Designer-${COMMIT}-arm64.zip"
  cp "$ZIP" "$DEST"
  echo "✓ Archive : $DEST"
fi
echo "  Non signée / non notarisée (identity:null)."
