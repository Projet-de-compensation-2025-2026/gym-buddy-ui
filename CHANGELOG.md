# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

### Changed

## [1.0.0] — 2026-08-30

### Added

- Admin fixtures page generate/reset with Approved counts (ticket #70, FS-ADM-05, mockup 21). Uses orval `postAdminFixtures` / `postAdminFixturesReset`. Non-production only.
- Inbox and chat at `/messages` and `/messages/:id` (aliases `/inbox`, `/inbox/:id`) (FS-MSG-01..10). Ticket #67. Text, image, and audio composer. Friends-only Message on `/u/:handle`. WebSocket live updates with HTTP poll every 10 s if the socket is down. Mockups 13–14.
- Isolated Angular back-office (`gym-buddy-admin` bundle under `/admin`) for Users, Content, Reports, Media, Fixtures, and Audit (FS-ADM-01..09, FS-ACCT-08/09). Ticket #69. Members do not receive staff JS. Leftover chrome (Dashboard, Bookings, Analytics, Invite User, Export CSV, Billing, + New Session) is not implemented. Fixture generate/reset counts are ticket #70.
- Friend suggestions on `/suggestions` (FS-SUGG-01..07, FS-MATCH-01..03). Ticket #66. Cards with reason line, sports chips, Add Friend / Dismiss, and a weekly “Match me this week” toggle. Empty feed still links here.
- Search page `/search` (FS-SRCH-01..08). Ticket #65. Filters (q, city, radius km, sports, experience), People / Events tabs, CONNECT and JOIN EVENT. Empty, loading, and error states. Mockup 12. API radius is kilometres.
- Events pages `/events`, `/events/new`, `/events/:id` (FS-EVT-01..13). Ticket #64. Instant / Recurring filters, create form, apply/accept, 90-day occurrences, organizer applicant queue. Mockups 09–11.
- Friends news feed on `/` (FS-FEED-01..07). Ticket #63. Composer plus reverse-chrono posts and reposts from the viewer and accepted friends. Empty feed links to `/suggestions`. Public non-friend posts stay off this feed.
- Nested comments on `/posts/:id` (FS-CMT-01..07). Ticket #62. Nested indent,
  like/reply, author tombstone, load-more replies. Max depth 4. No media in
  comments.
- Posts composer on `/` and post chrome on `/posts/:id`: create, like, and
  repost (FS-POST-01..08). Ticket #61. Max 4 images via media `kind=post`.
  Visibility Friends (default) or Public. No video posts.
- Avatar upload on `/settings/profile` via `POST /media` + signed PUT (FS-MED-01..09).
  Ticket #68. Max **8 MiB** (mockup “Max 2MB” is leftover). No local `/uploads`.
- Friends management (`/friends`): inbound accept/decline, outbound cancel,
  unfriend, block, and client-side search. Add Friend / Request Friend on
  `/u/:handle`. Ticket #60. Avatars stay placeholders until media (#68).
  Message stays disabled until messaging (#67).
- Public/private profile pages (`/u/:handle`), edit profile, and privacy settings
  (visibility, password change, close account). Ticket #59. No Notifications,
  Billing, or workout tracker.
- Build generates an Angular `HttpClient` from the versioned
  [gym-buddy-openapi](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi)
  package tag `v0.1.0` (`openapi/openapi.yaml` `$ref` tree, orval 8.22.0).
  No `openapi.yaml` / `bundled.yaml` is checked in.

### Changed

- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `f849a1dcd498c12fd9507b83f9d50d375d651347` (ticket #70) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- Release writes the computed SemVer into `package.json` before the tag
  (humans do not hand-edit that number). Auto bump still refuses `1.0.0`.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `8f89f1a72b1ddb6996d9598e6cedbac4d4788ace` (ticket #69) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `2550b32f95dcb881b0bfaa37e30f130595dbe9d3` (tickets #66 suggestions and #65 search) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `2ebc892909eed2a79841a4aea572aef1968747b4` (ticket #64) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `3e63187727035b5277738db90c44744406057b4c` (ticket #60) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `edca075cdf1e1eb6caf6f094e02cadaba7c480b5` (ticket #68) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `82d0eadb592c023fe3934836c7ce0ca15ca56abd` (ticket #63) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `01ab3d50195833296b10e8ca44aa89d1e046683a` (ticket #62) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- OpenAPI consumer pin is gym-buddy-openapi develop SHA
  `d58a824e0720c2f50c56632e3664d3632484e281` (ticket #61) until the next 0.1.x
  tag. Not a `bundled.yaml` GET.
- Handwritten auth models / HTTP service are a thin wrapper over the generated
  `GymBuddyAPIService`. Register, login, refresh, logout, and healthz keep the
  same URLs and cookie credentials.

## [0.1.1] — 2026-08-18

### Added

- Password visibility toggle (eye) on register and login
- README documents the live GitHub Pages project site (login-from-Pages is not claimed)

### Changed

- Production `apiBaseUrl` is the VPS (`https://vps-c39cdf03.vps.ovh.net/api/v1`). Local `ng serve` still uses `/api/v1`. Login-from-Pages is not claimed until Sentinel re-curls.

## [0.1.0] — 2026-08-18

### Added

- Angular 22 app with sign-up, sign-in, and log-out calling `/api/v1/auth`
- In-memory access token (not `localStorage`); refresh/logout send cookie credentials
- Prettier 3.6.2 so CI `format.sh --write` formats the tree
- Unit tests for FS-ACCT-01, FS-ACCT-02, FS-ACCT-03, FS-ACCT-04, FS-ACCT-06

### Changed

- Production Angular build uses `baseHref` `/gym-buddy-ui/` so the existing Deploy `ng build` emits GitHub Pages project-site asset paths
- Package manager is pnpm (`packageManager`: `pnpm@11.22.0`) with a four-week release-age floor (`minimumReleaseAge: 40320` minutes)
- TypeScript is `~6.0.2` (newest Angular 22 supports). Wiki names TypeScript 7.0; the compiler gap is recorded here as [07-Technology-choices.md](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-documentation/blob/develop/20-Architecture/07-Technology-choices.md) requires
- Smoke and deploy build `ng build` now that `angular.json` exists
- Auth TypeScript types follow [gym-buddy-openapi](https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi) 0.1.0 (`RegisteredUser.role`, login `403` FORBIDDEN, no `expiresIn`)

[Unreleased]: https://github.com/Projet-de-compensation-2025-2026/gym-buddy-ui
[1.0.0]: https://github.com/Projet-de-compensation-2025-2026/gym-buddy-ui/releases/tag/v1.0.0
[0.1.1]: https://github.com/Projet-de-compensation-2025-2026/gym-buddy-ui/releases/tag/v0.1.1
[0.1.0]: https://github.com/Projet-de-compensation-2025-2026/gym-buddy-ui/releases/tag/v0.1.0
