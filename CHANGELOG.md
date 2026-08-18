# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Angular 22 app with sign-up, sign-in, and log-out calling `/api/v1/auth`
- In-memory access token (not `localStorage`); refresh/logout send cookie credentials
- Prettier 3.6.2 so CI `format.sh --write` formats the tree
- Unit tests for FS-ACCT-01, FS-ACCT-02, FS-ACCT-03, FS-ACCT-04, FS-ACCT-06

### Changed

- TypeScript is `~6.0.2` (newest Angular 22 supports). Wiki names TypeScript 7.0; the compiler gap is recorded here as [07-Technology-choices.md](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/blob/develop/20-Architecture/07-Technology-choices.md) requires
- Smoke and deploy build `ng build` now that `angular.json` exists

[Unreleased]: https://github.com/Projet-de-compensation-2025-2026/gym-buddy-ui
