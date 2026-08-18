# gym-buddy-ui

Angular 22 member app for Gym Buddies. Product decisions live in
[`gym-buddy-documentation`](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation).

This slice is basic **sign-up**, **sign-in**, and **log-out** (`/register`, `/login`).
It calls `POST /api/v1/auth/register`, `/login`, and `/logout`. The access JWT stays
in memory; the refresh token is the API’s HttpOnly cookie (`path /api/v1/auth`).
Friends, feed, and events are out of scope.

| Workflow | Trigger                | Promise                                                                 |
| -------- | ---------------------- | ----------------------------------------------------------------------- |
| CI       | PR / push on `develop` | Prettier `--write`, `ng test` (ChromeHeadless), `ng build` + HTTP smoke |
| Release  | `workflow_dispatch`    | squash `develop` → `main`, tag `vX.Y.Z`                                 |
| Deploy   | that tag               | GitHub Pages                                                            |

## Run locally

Requires Node.js `^22.22.3` (see `.nvmrc`).

```bash
npm ci
npm start
```

`ng serve` proxies `/api` to `http://127.0.0.1:8080`. Production builds use
`src/environments/environment.ts` (`http://127.0.0.1:8080/api/v1`).

```bash
bash .github/scripts/ci/format.sh --write
bash .github/scripts/ci/test.sh
bash .github/scripts/ci/smoke.sh
```

See [07-CI-CD.md](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/blob/develop/70-Engineering-practices/07-CI-CD.md).
