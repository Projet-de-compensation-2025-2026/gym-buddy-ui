#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"

if [[ -f angular.json ]]; then
  if [[ ! -d node_modules ]]; then
    pnpm install --frozen-lockfile
  fi
  pnpm exec ng build
fi

if [[ -d dist/gym-buddy-ui/browser ]]; then
  dir=dist/gym-buddy-ui/browser
elif [[ -d dist/browser ]]; then
  dir=dist/browser
elif [[ -d dist ]]; then
  dir=dist
elif [[ -d public ]]; then
  dir=public
else
  echo "SMOKE FAIL: no dist/ or public/" >&2
  exit 1
fi

port="${SMOKE_PORT:-4174}"
python3 -m http.server "$port" --bind 127.0.0.1 --directory "$dir" &
pid=$!
trap 'kill $pid 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  body="$(curl -fsS "http://127.0.0.1:${port}/" 2>/dev/null || true)"
  if [[ "$body" == *"Gym Buddy"* ]]; then
    echo "SMOKE OK: ${dir} answered HTTP"
    exit 0
  fi
  sleep 0.25
done
echo "SMOKE FAIL" >&2
exit 1
