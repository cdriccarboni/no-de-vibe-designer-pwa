#!/bin/zsh
# Assemble No-de Vibe Designer.app (Apple Silicon / Intel) — shell Chromium + serveur local.
# Usage: ./packaging/mac/BUILD-No-de-Vibe-Designer-app.command
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${NVD_APP_OUT:-$ROOT/dist}"
APP="$OUT/No-de Vibe Designer.app"
CONTENTS="$APP/Contents"
MACOS="$CONTENTS/MacOS"
RES="$CONTENTS/Resources"
APP_RES="$RES/app"

echo "→ Construction de : $APP"
rm -rf "$APP"
mkdir -p "$MACOS" "$APP_RES"

# Copier l'application web
rsync -a --delete \
  --exclude '.git' \
  --exclude '_incoming' \
  --exclude '_compare' \
  --exclude 'dist' \
  --exclude '.DS_Store' \
  "$ROOT/" "$APP_RES/"

# Info.plist
cp "$ROOT/packaging/mac/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT/packaging/mac/VibeDesigner.icns" "$RES/VibeDesigner.icns"

# Launcher : démarre un serveur HTTP local puis ouvre Chrome/Brave/Edge en mode app
cat > "$MACOS/No-de Vibe Designer" << 'LAUNCH'
#!/bin/zsh
set -euo pipefail
HERE="${0:A:h}"
APP_ROOT="${HERE:h}"
RES="$APP_ROOT/Resources/app"
PROFILE="$HOME/Library/Application Support/No-de Vibe Designer/ChromiumProfile"
LOGDIR="$HOME/Library/Logs/No-de Vibe Designer"
mkdir -p "$PROFILE" "$LOGDIR"

PORT_FILE="$LOGDIR/http.port"
# Choisir un port libre
PORT=$(python3 - <<'PY'
import socket
s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()
PY
)
echo "$PORT" > "$PORT_FILE"

cd "$RES"
python3 -m http.server "$PORT" --bind 127.0.0.1 >"$LOGDIR/http.log" 2>&1 &
HTTPPID=$!
echo "$HTTPPID" > "$LOGDIR/http.pid"
sleep 0.6

URL="http://127.0.0.1:$PORT/desktop/"
CANDIDATES=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  "$HOME/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
)
BROWSER=""
for c in "${CANDIDATES[@]}"; do
  if [[ -x "$c" ]]; then BROWSER="$c"; break; fi
done
if [[ -z "$BROWSER" ]]; then
  /usr/bin/osascript -e 'display dialog "No-de Vibe Designer nécessite Google Chrome, Brave, Edge ou Chromium pour ce build. Installez-en un puis relancez." buttons {"OK"} default button 1 with icon caution'
  kill "$HTTPPID" 2>/dev/null || true
  exit 1
fi

cleanup(){ kill "$HTTPPID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

exec "$BROWSER" \
  --app="$URL" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  --disable-translate \
  --disable-features=TranslateUI \
  --window-size=1440,930
LAUNCH
chmod +x "$MACOS/No-de Vibe Designer"

# Installer helper à côté
cp "$ROOT/packaging/mac/INSTALLER-No-de-Vibe-Designer.command" "$OUT/INSTALLER-No-de-Vibe-Designer.command"
chmod +x "$OUT/INSTALLER-No-de-Vibe-Designer.command"

# Lever quarantine locale
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true

echo "✓ App prête : $APP"
echo "  Lancer : open \"$APP\""
echo "  Ou installer : $OUT/INSTALLER-No-de-Vibe-Designer.command"
echo "  Note : dépend encore de Chrome/Brave/Edge (étape transitoire)."
