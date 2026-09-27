#!/bin/zsh
set -e
HERE="${0:A:h}"
APP="$HERE/Code Vibe Designer.app"
if [[ ! -d "$APP" ]]; then
  echo "Place ce fichier à côté de Code Vibe Designer.app puis relance."; read; exit 1
fi
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
rm -rf "/Applications/Code Vibe Designer.app"
cp -R "$APP" "/Applications/Code Vibe Designer.app"
open "/Applications/Code Vibe Designer.app"
echo "Code Vibe Designer est installé dans Applications."
