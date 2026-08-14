# gym-buddy-ui

Angular 22 member app and back-office for Gym Buddies. Product decisions live in [`gym-buddy-documentation`](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation).

Pipeline-first: until `package.json` / `angular.json` exist, CI smokes a static placeholder so `develop` PRs still run a real server.

| Workflow | Trigger | Promise |
| --- | --- | --- |
| CI | PR / push on `develop` | format, tests, placeholder (later `ng build`) answers HTTP |
| Release | `workflow_dispatch` | squash `develop` → `main`, tag `vX.Y.Z` |
| Deploy | that tag | GitHub Pages |

See [07-CI-CD.md](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/blob/develop/70-Engineering-practices/07-CI-CD.md).
