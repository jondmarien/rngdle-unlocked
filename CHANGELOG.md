# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Vibration feedback (mobile)** — Web Vibration API pulses on Home Generate / Arcade actions (Settings → Vibration feedback). Default on for new installs; existing devices keep off until enabled. Silent no-op where unsupported (incl. Safari).

### Changed

- **UTC period resets** — Ranked community “today” / “this week” (highlights, crowns, leaderboard week) use UTC calendar day and UTC ISO week (Monday 00:00 UTC). Day streak + Stats calendar use UTC date keys. Ranked rolls/hour quota resets at each UTC hour (`:00:00Z`), not a rolling 60m window from first roll.

## [0.16.4] - 2026-07-14

### Fixed

- **Codex filter chip row** — equal-column `auto-fill` grid (`minmax(7.25rem, 1fr)`) so wrapped rows share a flush right edge; labels stay centered in each cell.
- **Cold lazy route pop-in** — `SuspenseReveal` always fades resolved screen content after Suspense (opacity + y, Corporate-quick); removes the Loading… → instant snap on first visit to a lazy tab.
- **Latest Runs position flash** — desktop rail portaled to `document.body` so RouteEnter/SuspenseReveal `y` transforms no longer trap `position:fixed` inside the centered main column (centered-then-snap on Roll tab load).

## [0.16.3] - 2026-07-14

### Added

- **Route entrance animation** — `AnimatePresence` + `RouteEnter` wraps all `AppRoutes` screens (opacity + 10px y enter, opacity-only exit ~140ms; `useReducedMotion` instant). Home stays eager inside shared Suspense for uniform tab transitions.

### Fixed

- **Codex filter chips** — remove per-chip `layout` (keep `layoutId` selected fill only); uniform `h-9` / `min-w-[7.25rem]` pills; always-mounted Show-locked slot with `invisible` + `aria-hidden` + `tabIndex={-1}` on New; reserved New count badge width.

## [0.16.2] - 2026-07-14

### Added

- **LottieFiles motion-design skill** — project skill at `.agents/skills/motion-design` (+ `skills-lock.json`) for animation timing/easing/choreography guidance; AGENTS.md points agents here for Motion work.
- **Motion conventions + primitives** — `src/lib/motion-conventions.md` (Motion vs CSS, Corporate-quick 150/200/300ms, `useReducedMotion`); reusable `FadeIn` / `MotionCard` under `src/ui/motion/`; `ScreenFallback` fade PoC.

### Changed

- **Profile avatars** — regenerate all 12 public emblems in embossed badge-seal style (gold/purple/teal relief) matching secret/journey art; same ids/paths.
- **Motion toasts/dialogs** — verified AnimatePresence exit + `useReducedMotion` intact; aligned enter/exit to Corporate-quick tokens (exit ~70% of enter, ease-in exits). Roll replay modal gains matching fade/scale enter.
- **Arcade shop + Codex art Motion** — shop cards use `whileHover`/`whileTap` + buy/deny `animate` (CSS buy/deny classes unused to avoid double-fire; keyframes left in global.css). Owned upgrade flash via Motion scale. Collection Journey/Lifetime/Secret art thumbs use `MotionCard` hover/press.
- **Motion layout chrome** — Arcade Run/Meta panel fade; Collection filter `layoutId` pill; Codex art → lightbox shared-element `layoutId` (same pattern as Home unlocks).

### Notes

- See `motion-integration-summary.md` for phase commits, bundle delta, and LottieFiles skill decisions. Celebration / NumberDisplay / Arcade FX keyframes in `global.css` were not migrated.

## [0.16.1] - 2026-07-14

### Added

- **Base UI dialogs + toasts** — replace native `window.confirm` / `window.prompt` with `@base-ui/react` AlertDialog/Dialog/Toast, themed to app tokens and animated with Motion (`AnimatePresence` + opacity for exit detection). Shared `confirmAsync` / `promptAsync` / `useToast` via `FeedbackProvider`.
- **Home unlock badge lightbox** — Journey / Lifetime EP / Secret mastery chips on Roll open the same `BadgeArtLightbox` as Codex/Profile (Motion `layoutId` shared-element when art is present).
- **History Highlights** — former Showcase (streaks, best roll, consecutive windows) lives under History → Highlights; `/showcase` redirects to `/history?view=highlights`.

### Changed

- **Motion** — add `motion` as shared UI animation infra (dialogs, toasts, lightbox, History view toggle).
- **Nav** — remove Showcase tab; History SegmentedToggle switches Highlights | All rolls (Motion `layout` fade).

### Notes

- Profile avatar Grok Image regen (FR Request 5) deferred — no `XAI_API_KEY` in overnight agent. Tailwind FR (Request 1) remains deferred. See `overnight-fr-batch-summary.md`.

## [0.16.0] - 2026-07-14

### Added

- **Arcade Deadline** — opt-in spicy shop upgrade (unlock after 2 completed runs). On buy: target = `max(20, ceil(digits × 1.75))`, 6 rolls to hit it for `ceil(target × 0.25)` Digits bonus; miss → hard bust (peak score). Additive columns `deadline_target_digits` / `deadline_rolls_remaining`. Existing upgrades unchanged.
- **Arcade Idle Digits** — Meta panel claim: server accrues 2 Digits/hour (12h offline cap → max 24/claim), bank cap 100. `POST /api/arcade/claim-idle`; Start run drains bank into starting Digits. Columns `idle_digits_bank` / `last_idle_claim_at`.
- **Arcade trash soft-fail** — 3 consecutive Trash rolls: lose `max(2, floor(digits×0.15))` Digits and halve Digits gains for the next 3 rolls (recoverable; not a bust). Separate `trash_streak` / `soft_fail_rolls_remaining` from Combo.

### Changed

- **Arcade Epic+ settle FX** — Epic through Divine Arcade rolls fire the same screen shake + CelebrationLayer confetti/edge blooms as Home (in addition to rarity glow art). Gated by confetti Settings toggle; Rare stays art-only punch.

## [0.15.0] - 2026-07-14

### Added

- **Arcade juice Phase 0** — reusable chrome under `public/icons/arcade/` (rarity glow/burst overlays, Digits coin glyph, passive/active shop textures, Cash Out / Abandon icons) + `src/lib/arcade-icons.ts` path registry. Presentation assets only; no mechanics change.
- **Arcade juice Phase 1** — Digits HUD count-up/down tween + coin glyph; rarity-scaled last-roll reveal punch (quiet Common/Uncommon; glow/burst + scale flash for Rare+); combo streak chip with 5+/10+/20+ escalation. Batch rolls still punch once on the final settle.
- **Arcade juice Phase 2** — procedural Arcade SFX in `fx.ts` (roll rarity ladder, Digits gain, purchase, cash-out, abandon/bust), gated by existing `soundEnabled`. Settings label clarifies Home + Arcade.
- **Arcade juice Phase 3** — shop cards use passive/active textures; hover lift on affordable offers; buy flash into owned styling; unaffordable click shake/dim without calling buy.
- **Arcade juice Phase 4** — Cash Out / Abandon buttons gain Phase 0 glyphs plus safe green vs danger red pulse (not color alone); Digits total stakes pulse while an active run has Digits > 0. No new confirmation dialogs.

### Changed

- **Oganesson (Atomic Registry)** — restore EP `25_000` (divine). One hit in 6.3k+ rolls; grail EP is intentional.

### Fixed

- **Prove roll Free play race** — gate the button on confirmed cloud publish (`waitForCloudPublish`) so immediate clicks no longer hit `/api/attest` 404 before the 12s auto-sync debounce. Ranked stays ready immediately (server-inserted). Residual seal errors use accurate copy (sign-in vs still syncing vs generic failure).

## [0.14.1] - 2026-07-14

### Changed

- **Site-wide accent coverage** — when Apply profile accent site-wide is on, active nav, SegmentedToggle (non-Ranked), Generate, Free/Daily/Weekly mode chips, ThemeToggle, Latest Runs tabs, Codex family chips, primary CTAs across History/Friends/Features/Settings/Account/Arcade/Admin, About/Legal links, and StatTiles follow `--accent`. Ranked amber and Features `--feature-*` / tag tokens unchanged.
- **Oganesson (Atomic Registry)** — EP `25_000` → `8_000` (mythic, same as other synthetic transactinides). Grail framing stays in flavor / Z=118. _(Reverted in Unreleased — back to 25k.)_

### Fixed

- **Prove roll popover placement** — tip pins above the button (native popover top-layer no longer dumps in the viewport corner).

## [0.14.0] - 2026-07-14

### Added

- **Atomic Registry family** — 118 element badges (Z=1–118 via last-three-digits exact match) + **Atomic Seal** section mastery (`secret-master-atomic-registry`). Coexists with the existing Element digit-pun family (unchanged). Family icon + seal art under `public/icons/family/atomic-registry.jpg` and `public/secrets/atomic-registry.jpg`. Forward-only Omega expansion (no grandfathering needed; 0 Omega holders at ship).

### Fixed

- **Firefox dark chrome** — restore Tailwind v4 `--tw-border-style` / shadow var fallbacks under `@supports (-moz-orient: inline)` so borders and sticky header structure match Chrome (modern Firefox skipped Tailwind’s gated fallbacks after relative-color support landed). Sticky header uses solid `--bg` instead of oklab `color-mix` opacity.

## [0.13.0] - 2026-07-14

### Added

- **Beverly Hills (90210)** — cultural exact badge.
- **Years family** — era-bucket badges (1700s / 1800s / 1900s / 2000s / 2010s / 2020s) with Chronarch section mastery; cultural year badges unchanged.
- **Prove roll popover** — native HTML Popover explains claim HMAC seal (not Free-play CSPRNG proof).
- **Profile seal subtitles** — Lifetime / Journey / Secret / Mastery cards show milestone `description` between name and life EP.
- **Site-wide profile accent** — Settings toggle applies Account accent to `--accent` (Ranked amber + Features `--feature-tag-*` stay dedicated).
- **Auto-pull on sign-in** — merge-safe `pullFromCloud` once per logged-out→in transition.
- **Lifetime rarity histogram** — local+synced `lifetimeRarityCounts` (no Neon full-history aggregate).
- **View Site As (admin, read-only)** — open a public profile layout with banner; no roll/sync/settings-as-them.
- **Bases radix equations** — BadgeCard shows `0x` / `0b` / `0o` digit strings with highlight masks.
- **Arcade Roll ×N** — 1/2/5/10/15 multi-roll inside an active Arcade run only (Home Free/Ranked unchanged).

## [0.12.2] - 2026-07-11

### Added

- **Collapsible How to roll** — Home mode picker uses Profile-style expand/collapse; open by default with full mode help. When collapsed, a label-only Free play / Ranked / Daily / Weekly selector remains; preference persists in local settings (`howToRollOpen`).

## [0.12.1] - 2026-07-11

### Added

- **Ranked all-time highlight tile** — Home community board shows Ranked · All-time best beside today/week (live query, Ranked-only). Crown labels prefixed with `Ranked ·` so Free play is not mistaken for crowns.

### Fixed

- **Profile Lifetime EP badges** — section sits directly under Best roll; seals also derive from public `lifetimeEP` so they appear even before collection backfill syncs.

## [0.12.0] - 2026-07-10

### Added

- **Lifetime EP badges** — 22 EP-scaled milestone seals (`family: lifetime`, art under `public/lifetime-ep/`) mirroring Journey unlock/toast/Codex/Profile/lightbox patterns. Future crossings grant lifetime EP; one-shot cosmetic backfill for already-reached tiers (toast shown, no EP). Section mastery Entropy Treasury + Codex Absolute now also requires all Lifetime EP seals.
- **Abbreviate large numbers** — opt-in Settings toggle (`abbreviateLargeNumbers`, default off). Compact EP/roll counts (e.g. 4.8M) with full value on hover via `title`.

### Fixed

- **Feature request edit rate limit** — admins are exempt from PATCH edit limits (same as submit); non-admins get a dedicated 20/hour edit budget. Client edit Save is single-flight with no mutation retries and surfaces 429 errors.
- **Discord OG embeds** — bump `og:image` URLs with `v=2` so Discord’s image CDN re-fetches after the SVG→PNG fix; `/api/og` never returns SVG on render failure (static `server/assets/og-fallback.png` or 503).

### Notes

- **Features page “message channel closed” console error** — investigated; no app `chrome.runtime` / service-worker / unresolved `postMessage` listeners. Matches common browser-extension noise (ad blockers, password managers). Not an app bug; no code change.

## [0.11.1] - 2026-07-10

### Added

- **Badge art lightbox** — click Lifetime / Secret / Mastery badge art on Profile or Codex to view full-resolution art (Escape, backdrop, or Close).
- **Share unlocked seals toggle** — Settings default-on to include journey / secret / mastery seal names on Discord paste + share PNG. Profile OG supports `?seals=1` and reuses the existing `collectionJson` read (no extra Neon query).
- **Feature request tags** — single-select categories (Bug Fix, New Feature, Change/Improvement, Badge Update) with dedicated `--feature-tag-*` colors (not status/rarity). Legacy rows stay Uncategorized (`tag` null). Run `node --env-file=.env.local scripts/add-feature-request-tag.mjs`.
- **Feature request author edit** — authors (and admins) can edit title / description / tag via `PATCH /api/feature-requests/:id`. Status remains admin-only.
- **Feature request image attachments** — Vercel Blob upload (`POST /api/feature-requests/upload`), 2MB image cap, public `image_url` column. Blob Data Transfer is separate from Fast Data Transfer / sync. Requires `BLOB_READ_WRITE_TOKEN`. Run `node --env-file=.env.local scripts/add-feature-request-image-url.mjs`.

### Fixed

- **Latest runs eye toggle** — spoiler blur preference now persists in localStorage via `AppSettings.latestRunsSpoilersHidden` (survives refresh).
- **Journey unlock toast art** — Home celebration for journey milestones now shows badge images the same way secret mastery unlocks do.
- **Feature request migration scripts** — Neon serverless `sql` calls use tagged templates (`sql\`...\``) so `add-feature-request-tag.mjs`/`add-feature-request-image-url.mjs`work on`@neondatabase/serverless` 1.x.
- **System inbox CTA labels** — Alerts no longer hardcode "Open roll"; hrefs like `/whats-new` show "Open What's new" (rolls still say "Open roll").

### Changed

- **Share roll count default on** — `shareShowRollCount` defaults to true for new installs. Existing saves that never set the key are presence-migrated to true; explicit `false` opt-outs are preserved.
- **Feature request submit** — admins (`role=admin` or `ADMIN_USER_IDS`) are exempt from the hourly submit rate limit (server-side `isAdminRole` check).

### Notes

- Ops: `node --env-file=.env.local scripts/add-feature-request-tag.mjs` and `scripts/add-feature-request-image-url.mjs` (additive columns). Set `BLOB_READ_WRITE_TOKEN` on Vercel for FR image uploads.

## [0.11.0] - 2026-07-10

### Fixed

- **Discord OG embeds** — ship `@resvg/resvg-wasm` `index_bg.wasm` under `server/assets/` during `bundle:api` and load it via the same multi-path resolver as Inter fonts. Without the binary, `/api/og` fell back to SVG (HTTP 200) which Discord ignores.
- **Sync quota stopgap** (PR #4) — reject `/api/sync` bodies over 256KB (413), log payload sizes, debounce auto-sync by 12s, and stop re-POSTing full saves during share-publish polls.
- **Sync Neon history load** — `loadCloudSave` now `ORDER BY rolled_at DESC LIMIT 500` instead of selecting every lifetime roll then slicing in memory. Adds `rolls_user_rolled_at_idx` (`scripts/add-rolls-user-rolled-at-idx.mjs`). Cuts Neon egress for power users with >500 rolls (e.g. 1600+ lifetime rows → 500).

### Changed

- **Delta `/api/sync`** — client POSTs `mode: 'delta'` with only pending rolls (≤60) + new collection rows + absolute counters; server returns compact `{ ok, updatedAt, counts }` ack instead of full `{ cloud }`. Legacy full payloads still accepted. `pullFromCloud` applies GET merge locally (no discard-then-full-POST). Shared merge helpers in `src/lib/sync-merge.ts`.

### Notes

- Ops: ensure `rolls_user_rolled_at_idx` exists in production (`node --env-file=.env.local scripts/add-rolls-user-rolled-at-idx.mjs` if needed).
- Deferred transfer follow-ups (notifications peek, slim badges, etc.): [`docs/superpowers/plans/2026-07-10-transfer-second-pass-d-h.md`](docs/superpowers/plans/2026-07-10-transfer-second-pass-d-h.md).

## [0.10.2] - 2026-07-10

### Added

- **Friends board filter** — Ranked / Practice (and Best Roll) support Circle → Friends (`?friendsOnly=1`), scoped to people you follow plus yourself. Sign-in required.
- **`/friends` tab** — manage who you follow (avatar, flair, lifetime EP, unfollow). Reuses `GET` / `DELETE /api/follow`.

## [0.10.1] - 2026-07-10

### Fixed

- **Streak secret unlock art on Home** — celebration card used a `secret-master-*` path heuristic, so streak ids resolved to missing files (e.g. `/secrets/secret-streak-odd-5.jpg`). Now prefers each secret’s `image` field from `secretHits`.

### Changed

- **Profile Journey badges** — show only the highest earned milestone by default; “Show all N journey badges” expands the full list.
- **Profile Secret badges** — new section for streak / Giant Numbers secrets from synced collection (separate from section masteries).
- **Profile section order** — Best roll sits above Journey badges (then secrets; Codex stays below).
- **Profile Codex unlocks** — collapsed by default; expand to browse.

## [0.10.0] - 2026-07-10

### Added

- **Badge equation proofs (v3)** — prime (abbreviated `no factor ≤ √n`), Fibonacci recurrence (`F(k−1) + F(k−2) = N`), and Twin Gate Prime bookend proof. Palindrome / void trailing-zero equations deferred.
- **Cat & Ultimeme cultural badges** — `:3` / `:33` / Kitty Power / `:3333` / Felis Catus / Exact `:3` / Ultimeme / Exact Ultimeme (contains + exact stack per existing precedent).
- **Bases family** — 10 numeral-base badges (Hex Twin through Bit Saturate) + **Radix Crown** section mastery. Existing Codex Absolute holders grandfathered; new earners must collect Bases. Family icon + Radix Crown seal art shipped under `public/icons/family/bases.jpg` and `public/secrets/bases.jpg`.
- **Workstream H cheap wins** — **The Worst** (other badges sum to exactly 1,758 EP); streak secrets Very Odd / Extremely Odd / Uneven / Very Uneven (5/10 odd or even); **Giant Numbers** (last five roll values sum > 4,000,000). Parity current streaks recompute from history on sync/import (never `Math.max` of client counters). Streak seal art under `public/secrets/streak-*.jpg` and `giant-numbers.jpg`.

### Notes

- Bases / cat / equation v3 / H are **forward-only**. No schema migration. Regenerate `sectionBadgeIds` via `scripts/dump-section-ids.mts` (already applied).
- **Deferred / cut (H):** Been There / Seen That, Ascended / Withered, Lucky Burst.

## [0.9.0] - 2026-07-10

### Added

- **Latest Runs spoiler eye** — optional header toggle blurs number / rarity / EP / badge count (session-only; default off).
- **Divine rarity** — new top tier above Mythic (≥25,000 EP roll / ≥20,000 badge EP); Arcade Digits base 160; gold visual treatment. Forward-only for new rolls (no history backfill).
- **Two Trips poker badge** — two distinct digits each appearing three times (2,400 EP); mutually exclusive with trips / full-house. Forward-only; announcement draft in `docs/announcements/two-trips-draft.md`.
- **Three Pair & Full Quads** — three distinct pairs (2,000 EP) and four-of-a-kind plus a pair (5,000 EP); mutually exclusive with two-pair / quads. Forward-only; announcement draft in `docs/announcements/poker-three-pair-full-quads-draft.md`.
- **Badge equation proofs** — Harshad and div3–div1000 cards show `N = divisor × quotient` under the description (digit highlights unchanged).
- **Badge equation proofs (v2)** — square / cube / fourth-power / power-of-two / pronic / digit-sum badges show kind-aware proofs (powers, `k×(k+1)`, digit sums).
- **Twin Gate Prime on length-2** — `hasBookends` allows matching ends on 2+ digit numbers (e.g. `11`). Forward-only.

### Notes

- Poker / rarity / bookend scoring changes are **forward-only** (no history backfill). No schema migration required.

## [0.8.1] - 2026-07-10

### Fixed

- **Signed-in onboarding checklist** — Ranked / Journey / Features steps now complete from real signals (`history.source === 'ranked'`, Journey collection unlocks, Features `votedByMe`) instead of hardcoded `done: false`.
- **Cloud pull `rolls.source`** — `loadCloudSave` maps `source` so Ranked provenance survives sync across devices.
- **Sync integrity lifetime roll count** — when client history is at `HISTORY_CAP` (500), skip `claimed ≤ cloud + newRolls + slack`; foreign-roll / best-roll / EP / collection checks unchanged (`assertLifetimeRollCountOk`).

### Added

- **Daily / Weekly challenge countdown** — locked helper shows live `Resets in …` until next UTC day / Monday 00:00 (`useCountdownToUtcReset`, 30s tick).

### Notes

- No schema migration required for this release.

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
