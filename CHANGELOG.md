# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Admin **Users** tab lists all accounts (paginated) with live search filter — TanStack Table + server `page`/`limit`/`total`.
- Admin **Edit** username (`POST /api/admin/users/username`) + `scripts/backfill-usernames.mjs` for accounts with `username IS NULL` (missing `@` → excluded from leaderboards).
- Feature request status **In progress** (`in_progress`) between Planned and Shipped.

### Changed

- **Vite 8.1** + `@vitejs/plugin-react` 6 (Rolldown/Oxc). Vendor splits via `build.rolldownOptions.output.codeSplitting`. Local `vite build` ~0.4s (was ~3s on Vite 6).
- **Bundle size:** route-level lazy loading for secondary screens, deferred share/confetti/html-to-image chunks, and vendor chunks — main entry JS ~59 KB (was ~639 KB).
- **Vercel API deploy:** `pnpm build:vercel` esbuild-bundles each `api/**/*.ts` into `api/_bundles/` and (on Vercel) replaces sources with thin `@ts-nocheck` stubs so the Node builder no longer typechecks the full server/game graph per handler (`scripts/bundle-api.mjs`).

### Fixed

- Root `tsconfig.json` is the api/server NodeNext config (not an empty project-references solution). Vercel ignores references when typechecking `/api`, which previously flooded builds with `process` / `Buffer` / discriminant-narrowing errors while still deploying.

## [0.6.0] - 2026-07-09

### Added

- **Best Roll leaderboard** — `GET /api/leaderboard?view=best` with `sortBy=ep|rarity`; Ranked + Practice; all-time / week; one personal best per player. Total EP board (`view=total`, default) unchanged.
- Leaderboard UI: **Total EP** / **Best Roll** and **By EP** / **By Rarity** `SegmentedToggle`s; Zod on best-roll response.
- **Features tab** (`/features`) — signed-in list, submit, upvote; admin inline status (`submitted` → `declined`); optimistic upvote UX.
- API: `GET|POST /api/feature-requests`, `POST /api/feature-requests/:id/vote`, `PATCH /api/admin/feature-requests` (audit logged).
- Schema: `feature_requests`, `feature_request_votes`; migration/indexes via `scripts/migrate-features-and-best-roll.mjs`.
- Rate limits: feature submit 5/hour, vote 30/min, list 60/min.
- Open Graph for `/features`; leaderboard OG copy mentions Best Roll.
- **What’s new** chronicle at `/whats-new` (nav tab; `/changelog` alias) — timeline with date/version rail, tags, and sections. Open Graph + bot rewrite for `/whats-new` and `/changelog`.
- About: number/badge rarity ladders, single-digit odds explainer, honest “what we protect” privacy notes.
- Self-serve **account deletion** (Better Auth `deleteUser` + confirmation email); Account UI + Privacy Policy wording.
- Smoke tests for single-digit badge scoring (`src/game/rarity-digits.smoke.test.ts`).

### Changed

- About no longer embeds the full What’s new list; it links to `/whats-new` instead.
- Exported `BADGE_RARITY_THRESHOLDS` from the game barrel for About rarity tables.

### Notes

- After deploy, run: `node --env-file=.env.local scripts/migrate-features-and-best-roll.mjs`

## [0.5.1] - 2026-07-09

### Added

- About → **What’s new** — player-facing release highlights (`src/lib/whats-new.ts`), separate from this developer changelog.
- **Open Graph for public SPA routes** — bot rewrites for `/`, `/leaderboard`, `/about`, `/collection`, `/showcase`, `/stats`, `/terms`, `/privacy` (+ aliases); shared brand card via `/api/og?type=page`; baseline `og:*` / `twitter:*` in `index.html`; legacy `/r/:id` bot rewrite; browser `document.title` per route.
- System inbox broadcast for v0.5.1 pointing players to About → What’s new.

### Fixed

- README “How it works” Mermaid edge-label overlap.
- Stripped agent process narration from `docs/opus-report.md` (kept the audit body).

## [0.5.0] - 2026-07-09

### Changed

- Internal **architecture refactor** for readability and expandability (`aa8e91e`…`fc4fa65`).
  - **Tooling:** solution-style tsconfigs; `tsconfig.server.json` uses **NodeNext** so missing `.js` ESM imports fail `pnpm typecheck` before Ranked can break on Vercel.
  - **Server:** `server/apiGuards.ts` (`requireUser` / `readJson` / `rateGuard`); read pipelines moved to `server/{leaderboard,profile,feed,ogSvg}.ts`.
  - **Client:** mandatory `src/lib/*-api.ts` wrappers; TanStack Query on leaderboard / feed / highlights / profile / admin-check; Zod at import / sync / profile trust boundaries; `useSync` + split game / settings / cloud contexts.
  - **Quality:** Better Auth session typing; format / StatTile / SegmentedToggle / rarity dedupe; `storage-keys.ts`; dead-code sweep.
- Documentation synced (`AGENTS.md`, `HANDOFF.md`, `README.md`, `docs/ARCHITECTURE.md`, refactor notes, oauth setup).
- Added this `CHANGELOG.md` and GitHub release **v0.5.0**.

### Notes

- **No intentional behavior, API contract, or game-rule changes** in the refactor itself.
- Manual AGENTS.md §9 roll-mode browser smoke is still required before claiming reel UX verified.
- Product work that lived in `package.json` as **0.4.1** without a GitHub tag is recorded under [0.4.1] below; this tag ships the architecture pass.

## [0.4.1] - 2026-07-09

Lived on `main` after `v0.4.0` with `package.json` at `0.4.1`, but **no annotated GitHub `v0.4.1` tag** was cut. Highlights from that wave (now on `main` / included with **0.5.0** history):

### Added

- **Latest runs** sidebar on Roll (Free / Ranked / Challenge tabs; live enter/exit).
- Tiered **celebrate FX** for epic / anomaly / mythic (confetti, blooms, shake, audio); Settings toggle covers the stack; center-origin confetti.
- **Discord + GitHub OAuth** wiring + Account link/unlink; Terms + Privacy pages for OAuth apps.
- Role-gated **`/admin`** (broadcast, users, reports); `ADMIN_SECRET` bootstrap-only.
- Email **verification** + magic link (Resend); cloned-progress profile pills + sync integrity gate.
- Share: Copy PNG beside Download PNG; Discord share badge list trimmed to top 3 +N.
- Settings: show/hide Latest runs; celebrate FX label clarity.

### Fixed

- Reel stuck on `?????` after Daily/Weekly → Free mode switch.
- Ranked TypeScript nullability / Vercel build failures; Dependabot esbuild override.
- Latest runs layout (float under sticky chrome, not mid-column squeeze).
- Account auth copy + collapsed email form; OAuth link when provider email differs.

## [0.4.0] - 2026-07-09

### Added

- **Dual leaderboards** — **Ranked** (server free-play only) and **Practice** (synced Free play / honor system); Board toggle all-time / week.
- **Ranked** roll mode — server CSPRNG via `POST /api/ranked-roll`; requires sign-in + `@username`; crowns + overtake alerts; client sync cannot forge `source=ranked`.
- Absolute Ceiling **jackpot** + ultra-rare badge art.
- Overtake Activity notifications; System crown broadcasts for Ranked #1 (day/week/all-time).
- Sticky app chrome; history multi-sort / lane filters; personal best surfaces; community Ranked highlights on idle Roll.
- Profile vanity (avatars, accent, flair, bio), public codex toggle, secret masteries / Codex Absolute.
- In-app Activity + System notifications; Find players; Feed (self + following).
- Codex unlock timestamps + **New** (5‑minute) tab; NEW ribbons on first unlocks.
- Custom fonts (Outfit / Syne / JetBrains Mono) and rarity/family icon art.

### Changed

- Free play remains unlimited browser CSPRNG; synced progress places on **Practice** only (no community crowns).
- Score “Top %” curve recalibrated (anomaly ~5%, mythic ~1%).
- Mode switch fully resets the roll board.
- Sitewide copy / README / ARCHITECTURE for Ranked vs Free / dual boards.

### Fixed

- Ranked `FUNCTION_INVOCATION_FAILED` from ESM extensionless imports (`.js` extensions in `src/game`).
- Share race for anomaly/mythic auto-share; sync short_code clashes / bulk upsert timeouts.

## [0.3.0] - 2026-07-09

### Added

- **Share gates** — vanity `/s/:user/:code` only after cloud confirm; logged-out CTA; mythic/anomaly optional auto-open share.
- **You on the board** — own rank highlight + sticky card when outside the top list.
- **Follows + Feed** on Board.
- **Badge Codex** (spoiler-safe) + **Stats** (histogram, EP/hour, streak calendar).
- **Daily / Weekly** challenge modes (shared UTC seed + account).
- Optional **Prove this roll** HMAC attestation seal.
- Dynamic **OG** SVG (`/api/og`) for Discord previews.
- First-roll onboarding tip / account CTA.
- Auto cloud sync when signed in.

### Changed

- UI readability pass — larger type, clearer muted contrast, plain-language roll-mode picker.

### Deploy notes

- Run `node scripts/migrate-feature-wave.mjs` if `follows` / attestation / `short_code` columns are missing.

## [0.2.0] - 2026-07-09

First **social multiplayer** release on top of the unlimited solo playground.

### Added

- Unlimited rolls **0–1,000,000** (no 24h lock) with fortified browser CSPRNG.
- Badges, EP, rarity, journey milestones, history / collection / showcase.
- Email auth (Better Auth) + public `@username`.
- Merge-safe cloud sync to Neon Postgres.
- Leaderboards (all-time / week) and profiles at `/u/:username`.
- Public rolls + Discord OG via share APIs.
- SPA path-based routes; Vercel Node adapter for serverless APIs.

[0.6.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.6.0
[0.5.1]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.5.1
[0.5.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.5.0
[0.4.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.4.0
[0.3.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.3.0
[0.2.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.2.0
