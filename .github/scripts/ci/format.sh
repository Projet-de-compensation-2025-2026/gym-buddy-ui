#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"
mode="${1:---check}"
if [[ -f package.json ]] && grep -q prettier package.json; then
  npx --yes prettier@3.6.2 "$mode" .
else
  echo "FORMAT OK: Prettier will run once Angular / package.json exists"
fi
