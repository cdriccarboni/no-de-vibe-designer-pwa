#!/bin/zsh
set -e
HERE="${0:A:h}"
APP="$HERE/No-de Vibe Designer.app"
if [[ ! -d "$APP" ]]; then
  echo "Place ce fichier à côté de No-de Vibe Designer.app puis relance."; read; exit 1
fi
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
rm -rf "/Applications/No-de Vibe Designer.app"
cp -R "$APP" "/Applications/No-de Vibe Designer.app"
open "/Applications/No-de Vibe Designer.app"
echo "No-de Vibe Designer est installé dans Applications."
