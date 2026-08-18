#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"
mode="${1:---check}"
if [[ -f package.json ]] && grep -q prettier package.json; then
  if [[ ! -d node_modules ]]; then
    pnpm install --frozen-lockfile
  fi
  pnpm exec prettier "$mode" .
else
  echo "FORMAT OK: Prettier will run once Angular / package.json exists"
fi
