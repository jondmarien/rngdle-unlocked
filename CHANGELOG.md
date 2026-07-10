# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.0] - 2026-07-10

### Added

- **Signed-in onboarding checklist** — dismissible Home checklist for username, first sync, and Ranked (`SignedInOnboardingChecklist`).
- **Shared roll row** — Feed / History / Profile / Latest Runs use `RollRow` + relative timestamps + lane chips.
- **Query error Retry** — `QueryErrorBanner` on Board, Feed, Features, Arcade, Profile, Highlights; Ranked quota pill Retry on failure.
- **Admin stats** — `GET /api/admin/stats` + Admin screen summary cards.
- **Username blocklist** — reserved handles (e.g. `admin`) blocked for new claims; grandfathered holders keep their name via `isValidUsername(..., { currentUsername })`.
- **oxlint-tailwindcss** — `enforce-consistent-variable-syntax` (Tailwind v4 `bg-(--token)` shorthand) via Vite+ `lint` + `.oxlintrc.json`; `pnpm lint` / `pnpm lint:fix`.
- Focus-visible styles; `SegmentedToggle` keyboard / `aria-pressed`; icon-button `aria-label`s.
- History text search; Features search; empty leaderboard CTAs; Profile “Compare with me”.

### Changed

- Ban enforcement: `requireUser` returns **403 Account banned** (checks `banned` / `banExpires`); admin ban fallback also deletes sessions.
- Attest no longer inserts client-scored rolls; sync integrity checks `lifetimeRollCount`.
- Admin: FR delete; reports filters + Ban+resolve; wipe clears Arcade tables; `PATCH /api/me` rate-limited.
- Shared query keys for notifications / following usernames; touch-target polish on primary controls.
- About / Settings version footer via `APP_VERSION` helper (`src/lib/app-version.ts`).

### Fixed

- `scripts/migrate-arcade.mjs` present for Arcade schema ops (tables + one-active-run partial unique).
- Grandfathered `@admin` (and other blocklisted holders) can keep / re-save their existing username.

### Notes

- After deploy, ensure Arcade tables exist: `node --env-file=.env.local scripts/migrate-arcade.mjs` if not already run.
- Tailwind class rewrite is presentation-only (canonical CSS variable syntax).

## [0.7.4] - 2026-07-09

### Added

- **Codex search** — Badge Codex (`CollectionScreen`) text filter above section tabs; matches unlocked `name`/`description`, locked cards only via visible placeholder copy (spoiler-safe). Respects active tab + Show/Hide locked; clear control + empty-results message.

### Notes

- Presentation-only — no catalog, unlock, or EP changes.

## [0.7.3] - 2026-07-09

### Added

- **Journey badge artwork** — custom 1024×1024 seals for all 22 lifetime milestones under `public/journey/{threshold}.jpg`; catalog `image` on `JOURNEY_BADGES` (same optional-art pattern as Absolute Ceiling).
- Collection Journey cards render art thumbs (locked: blurred + 🔒, name still `????`).
- Profile **Journey badges** collapsible section (unlocked only), placed before Secret masteries; Journey removed from Codex unlocks filter.

### Notes

- Visual-only — no changes to Journey unlock thresholds, EP, or unlock logic.

## [0.7.2] - 2026-07-09

### Added

- **Ranked quota indicator** — Home shows remaining Ranked rolls in the current hour window (`N/90 left`) plus honest `resets in Xm` for the request-anchored fixed window.
- `GET /api/ranked-roll/quota` — read-only peek (`peekRateLimit`); soft burst `LIMITS.rankedQuotaPerMinute` (60). Does not consume Ranked rolls.
- Additive `quota` metadata on `POST /api/ranked-roll` success and 429 bodies (`remaining`, `limit`, `used`, `resetsInSec`, `resetAt`).
- `rateCheck` in `server/apiGuards.ts` so handlers can attach quota without discarding the check result; Ranked handler moved to `api/ranked-roll/index.ts` (+ `quota.ts`).

### Notes

- Ranked gameplay cap unchanged (`rankedRollsPerHour: 90`, 1h window). Visibility only; client soft-fails quota-GET errors without a second rate-limit message.

## [0.7.1] - 2026-07-10

### Changed

- **Notifications inbox** — per-type accent chips and unread treatment; relative timestamps; denser system crown copy (headline vs detail).
- **Crown consolidation** — same-roll today / week / all-time overtake and system crown rows render as one card with period tags (display layer only; mark-read clears all member ids). Unread tab and Alerts badge counts match grouped cards.
- **Features tab** — dedicated `--feature-*` status colors (not rarity tokens); Active list plus always-visible collapsible Shipped / Declined sections; static upvote count on closed items.
- Shared `SectionHeader` extracted from Profile for Features (and Profile).

### Notes

- No changes to notification triggers, storage, feature-request status writes, or upvote APIs — presentation only.

## [0.7.0] - 2026-07-09

### Added

- **Arcade Mode** (`/arcade`) — server-authoritative Digits runs: shop upgrades (5 passive / 5 active), Double or Nothing bust, cash-out / two-step abandon, meta unlocks. Digits never convert to EP; no writes to `rolls` / `user_progress`.
- Arcade economy config (`src/game/arcade/economy.ts`) — tunable Digits curve, cooldowns, shop prices, unlock milestones.
- Schema: `arcade_meta`, `arcade_runs`, `arcade_run_rolls` + `scripts/migrate-arcade.mjs`.
- API: `/api/arcade`, `/start`, `/roll`, `/buy`, `/arm`, `/cash-out`, `/abandon`, `/leaderboard` (`requireUser` + rate limits).
- Leaderboard primary tabs: **Ranked | Practice | Arcade | Feed | Find**; metric+sort collapsed to one control; Arcade best-run Digits board with “You on the board”.
- Open Graph for `/arcade` (bot rewrite + page card).
- Admin **Users** tab lists all accounts (paginated) with live search filter — TanStack Table + server `page`/`limit`/`total`.
- Admin **Edit** username (`POST /api/admin/users/username`) + `scripts/backfill-usernames.mjs` for accounts with `username IS NULL` (missing `@` → excluded from leaderboards).
- Feature request status **In progress** (`in_progress`) between Planned and Shipped.

### Changed

- Leaderboard IA is mode-first (scope no longer a second equal-weight pill row under Board).
- **Vite 8.1** + `@vitejs/plugin-react` 6 (Rolldown/Oxc). Vendor splits via `build.rolldownOptions.output.codeSplitting`. Local `vite build` ~0.4s (was ~3s on Vite 6).
- **Bundle size:** route-level lazy loading for secondary screens, deferred share/confetti/html-to-image chunks, and vendor chunks — main entry JS ~59 KB (was ~639 KB).
- **Vercel API deploy:** `pnpm build:vercel` esbuild-bundles each `api/**/*.ts` into `api/_bundles/` and (on Vercel) replaces sources with thin `@ts-nocheck` stubs so the Node builder no longer typechecks the full server/game graph per handler (`scripts/bundle-api.mjs`).

### Fixed

- Daily / Weekly challenges lock after one Generate per UTC period (same seed would only repeat the number). Button shows “Done for today/week”; engine skips duplicate history/EP.
- Root `tsconfig.json` is the api/server NodeNext config (not an empty project-references solution). Vercel ignores references when typechecking `/api`, which previously flooded builds with `process` / `Buffer` / discriminant-narrowing errors while still deploying.

### Notes

- After deploy, run: `node --env-file=.env.local scripts/migrate-arcade.mjs`

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

[0.7.4]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.7.4
[0.7.3]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.7.3
[0.7.2]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.7.2
[0.7.1]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.7.1
[0.7.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.7.0
[0.6.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.6.0
[0.5.1]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.5.1
[0.5.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.5.0
[0.4.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.4.0
[0.3.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.3.0
[0.2.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.2.0
