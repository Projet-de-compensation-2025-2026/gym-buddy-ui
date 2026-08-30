# gym-buddy-ui

Angular 22 member app for Gym Buddies. Product decisions live in
[`gym-buddy-documentation`](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation).

This slice is **sign-up**, **sign-in**, **profiles**, **friend requests**,
**account settings**, **avatar upload**, **posts**, **nested comments**,
the **friends news feed**, and **events** (`/register`, `/login`, `/u/:handle`,
`/friends`, `/settings/profile`, `/settings/privacy`, `/`, `/posts/:id`,
`/events`, `/events/new`, `/events/:id`). The access JWT stays in memory; the
refresh token is the API’s HttpOnly cookie (`path /api/v1/auth`). Messaging is
a later ticket.

The HTTP contract is the versioned
[`gym-buddy-openapi`](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi)
package (ticket #64 pins develop SHA `2ebc892909eed2a79841a4aea572aef1968747b4`
until the next 0.1.x tag). This repo does **not** vendor `openapi.yaml` or
`bundled.yaml`.

`pnpm generate:api` (also run by `pnpm start`, `pnpm build`, and `pnpm test`)
points [orval](https://orval.dev) `8.22.0` (`client: 'angular'`) at
`node_modules/gym-buddy-openapi/openapi/openapi.yaml` so the `$ref` tree
resolves from that package checkout, then writes `src/app/api/generated/`.
Do not generate from `bundled.yaml`. Auth pages use a thin `AuthApi` wrapper
over the generated `GymBuddyAPIService` so login / refresh / logout still send
the HttpOnly refresh cookie. Friends uses `FriendsApi` the same way.

| Workflow | Trigger                | Promise                                                                   |
| -------- | ---------------------- | ------------------------------------------------------------------------- |
| CI       | PR / push on `develop` | Prettier `--write`, `ng test` (ChromeHeadless), `ng build` + HTTP smoke   |
| Release  | `workflow_dispatch`    | write SemVer into `package.json`, squash `develop` → `main`, tag `vX.Y.Z` |
| Deploy   | that tag               | GitHub Pages                                                              |

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
