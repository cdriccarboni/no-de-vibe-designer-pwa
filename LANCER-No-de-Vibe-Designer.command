#!/bin/zsh
set -e
cd "$(dirname "$0")"
PORT="${CVD_PORT:-4173}"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/no-de-vibe-designer.log 2>&1 &
PID=$!
sleep 1
open "http://127.0.0.1:$PORT/desktop/"
echo "Desktop : http://127.0.0.1:$PORT/desktop/"
echo "Mobile  : http://127.0.0.1:$PORT/mobile/"
echo "PID $PID · Ctrl+C pour arrêter"
trap 'kill $PID 2>/dev/null || true' INT TERM EXIT
wait $PID
