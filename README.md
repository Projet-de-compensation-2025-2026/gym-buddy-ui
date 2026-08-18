# gym-buddy-ui

Angular 22 member app for Gym Buddies. Product decisions live in
[`gym-buddy-documentation`](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation).

This slice is basic **sign-up**, **sign-in**, and **log-out** (`/register`, `/login`).
It calls `POST /api/v1/auth/register`, `/login`, and `/logout`. The access JWT stays
in memory; the refresh token is the API’s HttpOnly cookie (`path /api/v1/auth`).
Friends, feed, and events are out of scope.

The HTTP contract is
[`gym-buddy-openapi`](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi).
This repo does **not** vendor `openapi.yaml` or `bundled.yaml`.

`pnpm generate:api` (also run by `pnpm start`, `pnpm build`, and `pnpm test`)
fetches the consumer bundle from the raw GitHub URL pinned to
`gym-buddy-openapi@7fa510874e8ebb7d424f01629f3085705d569139` (short `7fa5108`)
and runs [orval](https://orval.dev) `8.22.0` (`client: 'angular'`) into
`src/app/api/generated/`. Choice: raw SHA URL, not an npm package, so the
build is reproducible without copying YAML into this tree. Auth pages use a
thin `AuthApi` wrapper over the generated `GymBuddyAPIService` so login /
refresh / logout still send the HttpOnly refresh cookie.

| Workflow | Trigger                | Promise                                                                 |
| -------- | ---------------------- | ----------------------------------------------------------------------- |
| CI       | PR / push on `develop` | Prettier `--write`, `ng test` (ChromeHeadless), `ng build` + HTTP smoke |
| Release  | `workflow_dispatch`    | squash `develop` → `main`, tag `vX.Y.Z`                                 |
| Deploy   | that tag               | GitHub Pages                                                            |

Live site: https://projet-de-compensation-2025-2026.github.io/gym-buddy-ui/

Production `apiBaseUrl` is `https://vps-c39cdf03.vps.ovh.net/api/v1` (the VPS API, not
a Pages URL). This does not claim that register/login from the Pages origin succeeds
(CORS / UFW / SameSite=Lax honesty gate is after this lands; Sentinel re-curls).
Client routes like `/register` may return HTTP 404 with the same index body (GitHub
Pages SPA fallback via 404.html). That is expected.

## Run locally

Requires Node.js `^22.22.3` (see `.nvmrc`) and the pinned pnpm from
`packageManager` (enable it with Corepack: `corepack enable`).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm generate:api
pnpm start
```

`ng serve` proxies `/api` to `http://127.0.0.1:8080` and uses
`src/environments/environment.development.ts` (`/api/v1`). Production builds use
`src/environments/environment.ts` (`https://vps-c39cdf03.vps.ovh.net/api/v1`).

```bash
bash .github/scripts/ci/format.sh --write
bash .github/scripts/ci/test.sh
bash .github/scripts/ci/smoke.sh
```

See [07-CI-CD.md](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/blob/develop/70-Engineering-practices/07-CI-CD.md).
