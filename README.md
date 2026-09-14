# Gym Buddy UI

Angular member website and administration console.

[Live website](https://projet-de-compensation-2025-2026.github.io/gym-buddy-ui/) · [Specifications and mockups](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation) · [API contract](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi)

## Development

Use the Node and pnpm versions declared in `package.json`. Start the API from the sibling service repository, then:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm generate:api
pnpm exec ng serve gym-buddy-ui
```

Member app: `http://localhost:4200`. Run `pnpm exec ng serve gym-buddy-admin` for the administration console (port 4201). Both proxy `/api` to `http://127.0.0.1:8080`.

## Verification

```sh
pnpm exec ng test gym-buddy-ui --watch=false --browsers=ChromeHeadless
pnpm exec ng test gym-buddy-admin --watch=false --browsers=ChromeHeadless
pnpm exec ng build gym-buddy-ui
pnpm exec ng build gym-buddy-admin
```

Generated clients come from the pinned OpenAPI package; do not edit them manually. Release instructions live in the documentation repository.
