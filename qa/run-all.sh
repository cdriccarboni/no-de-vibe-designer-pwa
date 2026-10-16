#!/usr/bin/env bash
# Lance toute la QA No[co]de. Les tests navigateur demandent Chrome + Playwright :
#   PLAYWRIGHT_PATH=/chemin/node_modules/playwright bash qa/run-all.sh
# Sans PLAYWRIGHT_PATH, ils sont listés comme non exécutés (jamais comptés comme réussis).
set -uo pipefail
cd "$(dirname "$0")/.."
export PUPPETEER_PATH="${PUPPETEER_PATH:-$PWD/qa/lib/puppeteer-compat.cjs}"
pass=0; fail=0; skip=0
run() { if "$@" > /tmp/nvd-qa.log 2>&1; then echo "✓ ${*: -1}"; pass=$((pass+1)); else echo "✗ ${*: -1}"; tail -6 /tmp/nvd-qa.log; fail=$((fail+1)); fi; }
for t in qa/*.mjs qa/*.cjs; do
  case "$t" in
    *e2e*|*sweep*|*browser-*|*remote-camera-qr*)
      [ -n "${PLAYWRIGHT_PATH:-}" ] || { echo "· non exécuté (navigateur absent) : $t"; skip=$((skip+1)); continue; } ;;
    *patch-zoom-anchor*) # demande un serveur local sur 3333
      [ -n "${PLAYWRIGHT_PATH:-}" ] || { echo "· non exécuté (navigateur absent) : $t"; skip=$((skip+1)); continue; }
      (PORT=3333 node scripts/serve.mjs >/dev/null 2>&1 &) ; sleep 1
      run node "$t"; pkill -f "scripts/serve.mjs" 2>/dev/null; continue ;;
  esac
  run node "$t"
done
echo "QA : $pass réussis · $fail en échec · $skip non exécutés"
exit $((fail > 0))
