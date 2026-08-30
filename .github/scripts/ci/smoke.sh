#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"

if [[ -f angular.json ]]; then
  if [[ ! -d node_modules ]]; then
    pnpm install --frozen-lockfile
  fi
  pnpm generate:api
  pnpm exec ng build gym-buddy-ui
  if grep -E 'getAdminUsers|postAdminFixtures|/admin/users' dist/main-*.js >/dev/null; then
    echo "SMOKE FAIL: member bundle contains staff HTTP client" >&2
    exit 1
  fi
  pnpm exec ng build gym-buddy-admin
  python3 .github/scripts/ci/stage_pages.py _site
  dir=_site
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

assert_body() {
  local path="$1"
  local needle="$2"
  local absent="${3:-}"
  local url="http://127.0.0.1:${port}${path}"
  local body
  body="$(curl -fsS "$url")" || {
    echo "SMOKE FAIL: GET ${url}" >&2
    exit 1
  }
  if [[ "$body" != *"$needle"* ]]; then
    echo "SMOKE FAIL: ${url} missing ${needle}" >&2
    exit 1
  fi
  if [[ -n "$absent" && "$body" == *"$absent"* ]]; then
    echo "SMOKE FAIL: ${url} unexpectedly contains ${absent}" >&2
    exit 1
  fi
}

for _ in $(seq 1 40); do
  body="$(curl -fsS "http://127.0.0.1:${port}/" 2>/dev/null || true)"
  if [[ "$body" == *"Gym Buddy"* ]]; then
    if [[ "$dir" == "_site" ]]; then
      assert_body "/" "<app-root>" "<admin-root>"
      assert_body "/login.html" "<app-root>" "<admin-root>"
      assert_body "/login/" "<app-root>" "<admin-root>"
      assert_body "/register/" "<app-root>" "<admin-root>"
      assert_body "/events/new.html" "<app-root>" "<admin-root>"
      assert_body "/friends/" "<app-root>" "<admin-root>"
      assert_body "/search/" "<app-root>" "<admin-root>"
      assert_body "/messages/" "<app-root>" "<admin-root>"
      assert_body "/suggestions/" "<app-root>" "<admin-root>"
      assert_body "/settings/profile/" "<app-root>" "<admin-root>"
      assert_body "/settings/privacy/" "<app-root>" "<admin-root>"
      assert_body "/admin/" "<admin-root>" "<app-root>"
      assert_body "/admin/login.html" "<admin-root>" "<app-root>"
      assert_body "/admin/login/" "<admin-root>" "<app-root>"
      assert_body "/admin/users/" "<admin-root>" "<app-root>"
      assert_body "/admin/content/" "<admin-root>" "<app-root>"
      assert_body "/admin/reports/" "<admin-root>" "<app-root>"
      assert_body "/admin/media/" "<admin-root>" "<app-root>"
      assert_body "/admin/fixtures/" "<admin-root>" "<app-root>"
      assert_body "/admin/audit/" "<admin-root>" "<app-root>"
      if [[ ! -f _site/404.html ]]; then
        echo "SMOKE FAIL: missing _site/404.html" >&2
        exit 1
      fi
    fi
    echo "SMOKE OK: ${dir} answered HTTP"
    exit 0
  fi
  sleep 0.25
done
echo "SMOKE FAIL" >&2
exit 1
