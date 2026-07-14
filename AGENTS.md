# AGENTS.md — RNGdle Unlocked

Instructions for AI coding agents and humans working in this repository.

**Live:** https://rngdle-unlocked.chron0.tech  
**Stack:** Vite + React 19 + TypeScript · Tailwind v4 · TanStack Query · Zod · Vercel serverless · Neon Postgres · Better Auth · Drizzle  
**Package manager:** pnpm 10 (`packageManager` field is authoritative)

---

## 1. Product in one page

**RNGdle Unlocked** is an unlimited random-number game (0–1,000,000): badges, EP, rarity, history, codex. Progress is **local-first** (`localStorage`). Cloud is **optional** (auth, sync, social, competitive Ranked). **Arcade Mode** (`/arcade`) is a separate Digits run layer — never interchangeable with EP.

**Not affiliated with rngdle.com.** Do not copy proprietary badge names/assets from that site.

### Roll modes (do not collapse these)

| Mode               | RNG                                     | Where it places                              | Crowns / overtake             |
| ------------------ | --------------------------------------- | -------------------------------------------- | ----------------------------- |
| **Free play**      | Browser CSPRNG (`src/game/rng.ts`)      | Leaderboard → **Practice** (synced progress) | No                            |
| **Ranked**         | Server CSPRNG (`POST /api/ranked-roll`) | Leaderboard → **Ranked**                     | Yes (today / week / all-time) |
| **Daily / Weekly** | Deterministic seed + subject id         | Challenge flavor; not Ranked crowns          | No                            |
| **Arcade**         | Server CSPRNG (run loop; not Home mode) | Leaderboard → **Arcade** (best Digits run)   | No (Digits ≠ EP)              |

- Free play stays unlimited and offline-capable.
- Ranked requires **signed-in user + public `@username`**.
- Client sync **must never** write `rolls.source = 'ranked'` (server only). On conflict, preserve `ranked`.
- Absolute Ceiling `1_000_000` has a uniform chance in range plus an independent **1-in-100M** jackpot (client Free + server Ranked).
- Arcade lives on `/arcade` (not `RollModePicker`); Digits never convert to EP; Arcade does not write `rolls`.

### Dual leaderboards (+ Arcade)

- **Ranked** (`?scope=ranked`): sum public `source=ranked` rolls.
- **Practice** (`?scope=practice`): all-time from `user_progress`; week from public non-ranked rolls.
- **Metric view** (`?view=total|best`, default `total`): Total EP (existing) or Best Roll (`sortBy=ep|rarity`) — one personal best per player; Practice Best Roll uses public practice rolls.
- **Arcade** (`GET /api/arcade/leaderboard`): best Digits run score — separate from EP; UI tab on Leaderboard (mode-first: Ranked | Practice | Arcade | Feed | Find).

### Feed & history lanes

- **Feed:** you + people you follow; toggles `source=all|ranked|practice`; all public rarities (not rare-only).
- **History:** filter Free play / Ranked / Challenge (missing `source` → treat as Free play).

---

## 2. Repo map

```
api/                 Vercel serverless entrypoints (Node adapter) — thin handlers
server/              Shared backend: apiGuards, auth, db, sync, rankedRoll, arcade,
                     rateLimit, leaderboard, profile, feed, ogSvg, notifications
src/game/            Pure TS engine (no React) — RNG, badges, rarity, secrets, challenge, arcade/
src/state/           GameProvider (contexts) + useSync + localStorage + settings reducer
src/ui/              Screens + reel/cascade components (+ ArcadeScreen)
src/lib/             Auth client, routes, *-api.ts wrappers, schemas.ts, themes, format
public/              Avatars, rarity/family icons, secrets art, Absolute Ceiling badge
docs/                ARCHITECTURE.md + refactor notes + design specs/plans
scripts/             Migrations (incl. migrate-arcade), diagnostics (prefer additive SQL)
```

| Path                     | Rules                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/game/`              | Pure, testable, no React/DOM side effects at import time (except `fx.ts` intentionally uses Audio)  |
| `src/ui/` + `src/state/` | UI + persistence; call game engine, never reimplement scoring                                       |
| `src/lib/*-api.ts`       | **Mandatory** client API wrappers — UI must not call `fetch('/api/...')` directly                   |
| `api/*`                  | Thin handlers → `server/*`; preamble via `server/apiGuards.ts`; `defineHandler` from vercel-adapter |
| `server/db/schema.ts`    | Source of truth for tables; deploy schema carefully (see §6)                                        |

Deep diagrams: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 3. Commands

```bash
pnpm install
pnpm dev              # SPA only (game works offline)
pnpm test             # vite-plus / vitest
pnpm typecheck        # app + node + tsconfig.server.json (NodeNext for api/server)
pnpm build            # app + node typecheck, then Vite production build (server graph is typecheck’s job)
pnpm build:vercel     # full typecheck + Vite + esbuild-bundle api/** → api/_bundles/ (Vercel: thin @ts-nocheck stubs in api/**/*.ts)
pnpm bundle:api       # esbuild each api entry (set BUNDLE_API_STRIP=1 to delete .ts after, as on Vercel)
pnpm lint
pnpm fmt              # Oxfmt write (single quotes — .oxfmtrc.json)
pnpm fmt:check        # format check (should be a no-op after fmt)
npx vercel dev        # SPA + /api/* locally (social)
pnpm db:push          # drizzle-kit push (can prompt truncate — avoid in prod blindly)
```

**TypeScript projects:** root `tsconfig.json` is the **api/server** config (`module`/`moduleResolution`: **NodeNext** / **nodenext**, `types: ["node"]`) — Vercel typechecks `/api` against the root config and **does not support project references**, so this cannot be an empty solution-style file. App/Vite use `tsconfig.app.json` (bundler) and `tsconfig.node.json`; `tsconfig.server.json` extends the root for `pnpm typecheck`.

**Formatting:** Oxfmt via Vite+ (`vp fmt`). Repo standard is **single quotes** (`.oxfmtrc.json` + `vite.config.ts` `fmt.singleQuote`). Do not commit quote-only churn; re-running `pnpm fmt` should be a no-op.

**Prefer** additive scripts when drizzle wants to truncate:

```bash
node scripts/add-roll-source.mjs      # rolls.source column
node scripts/migrate-feature-wave.mjs # feature-wave columns / follows
```

Do **not** commit secrets, `.env`, `.env.local`, or one-off debug dumps (`scripts/*tmp*`, local `debug-*.mjs` unless intentionally shared).

---

## 4. Environment

See [`.env.example`](./.env.example). Typical vars:

| Variable                                      | Purpose                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                | Neon Postgres (pooled OK for serverless)                                                           |
| `BETTER_AUTH_SECRET`                          | Auth + HMAC attestations                                                                           |
| `BETTER_AUTH_URL`                             | Site origin (production must match real domain)                                                    |
| `VITE_APP_URL`                                | Client trusted origin                                                                              |
| `EXTRA_TRUSTED_ORIGINS`                       | Optional comma-separated extra Better Auth origins (prod + beta chron0.tech already hardcoded)     |
| `RESEND_API_KEY`                              | Outbound mail (magic link + email verification) — see [`docs/email-auth.md`](./docs/email-auth.md) |
| `EMAIL_FROM`                                  | Optional; default `RNGdle Unlocked <noreply@outreach.chron0.tech>`                                 |
| `ADMIN_SECRET`                                | Optional; bootstrap only (`scripts/promote-admin.mjs`) — not for browser admin                     |
| `ADMIN_USER_IDS`                              | Optional; comma-separated user ids treated as admin                                                |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth (see [`docs/oauth-setup.md`](./docs/oauth-setup.md))                                 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`   | GitHub OAuth                                                                                       |
| `LOG_LEVEL`                                   | Optional server log level                                                                          |

---

## 5. Architecture rules agents must respect

### 5.1 Client vs server RNG

- **Free play:** `performRoll()` / `rollNumber()` in the browser. Trust model is honor-system for Practice board.
- **Ranked:** only `issueRankedRoll` / `POST /api/ranked-roll`. Score on server with the same badge catalog.
- **Challenges:** `buildPeriodSeed` + `challengeNumber(seed, subjectId)` — deterministic, re-runnable.

Never claim “proof of honest client RNG” for Free play. Attestation (`/api/attest`) seals a **claim**, not honest CSPRNG.

### 5.2 `rolls.source`

Values: `client` | `ranked` | `challenge` (default `client`).

- Competitive surfaces (leaderboard Ranked, community highlights, system crowns, overtake notifs) filter **`source = ranked`**.
- Sync upserts from the client force non-ranked sources and must not demote existing ranked rows.

### 5.3 Game engine imports (Node / Vercel)

Serverless loads `src/game/**` as ESM under `/var/task`. **Relative imports in that graph need explicit `.js` extensions** (e.g. `from '../rarity.js'`). Extensionless imports break Ranked with:

`Cannot find module '/var/task/src/game/rarity'`.

Vite resolves `.js` → `.ts` fine. Keep this pattern when adding game modules used by `server/`.

**Compile-time enforcement:** `tsconfig.server.json` uses `moduleResolution: nodenext`, so `pnpm typecheck` fails on extensionless relative imports in the api/server graph. Do not switch the server project back to `bundler` — that was the root cause of recurring Ranked outages.

### 5.4 Serverless handlers

- Export default via `defineHandler` (Node `req/res` → Fetch `Request`/`Response`).
- **Required preamble** for new handlers: `requireUser`, `readJson`, and/or `rateGuard` from [`server/apiGuards.ts`](./server/apiGuards.ts) — do not re-copy per-handler auth/JSON/rate-limit boilerplate.
- **Thin `api/*` → `server/*`:** enforced for **reads** (leaderboard, profile, feed, notifications, og) as well as writes. Query/assembly logic lives in `server/{leaderboard,profile,feed,ogSvg,notifications}.ts` (and peers). Some write handlers (`follow`, `me`, `attest`, `sync` orchestration) still keep more logic inline — prefer extracting when touching them.
- Auth: Better Auth session via `apiGuards` / `getSessionUser` (typed username/role — no `as` casts for session fields).
- Rate limits: `server/rateLimit.ts` via `rateGuard` — soft API burst guards, **not** free-play gameplay locks.
  - There is **no** hourly free-play roll-upload cap (removed).
  - Ranked still has `rankedRollsPerHour` (server cost).
- Prefer keeping handler graphs esbuild-friendly (static imports) so `scripts/bundle-api.mjs` can emit one `.js` per entry. Dynamic `import()` of local modules is avoided for the Vercel prebundle path.
- **Vercel deploy:** `buildCommand` is `pnpm build:vercel` — after the SPA build, `scripts/bundle-api.mjs` esbuild-bundles each `api/**/*.ts` into `api/_bundles/**` (underscore dir is ignored for function discovery). On `VERCEL=1`, each `api/**/*.ts` becomes a thin `@ts-nocheck` stub importing the matching bundle. Do not colocate `export { default } from './name.js'` next to `name.ts` (TS2303 circular alias under NodeNext). Do not delete `.ts` entry paths (Vercel already registered them). Local `vercel dev` / `bundle:api` keep real TypeScript sources; do not commit `api/_bundles/` or `api/**/*.js`.

### 5.4b Zod at trust boundaries

Runtime schemas live primarily in [`src/lib/schemas.ts`](./src/lib/schemas.ts) (shared shapes) plus server sync validation:

| Boundary                        | Where                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Save **import** payload         | `parseImportPayload` in `src/state/storage.ts`                                                   |
| Cloud **sync** POST body        | `api/sync.ts` + schema in `server/sync.ts`                                                       |
| Public **profile** GET response | `src/lib/profile-api.ts`                                                                         |
| Feature request submit / list   | `featureRequestSubmitSchema`, list item schemas in `src/lib/schemas.ts`                          |
| Arcade run / meta / leaderboard | `arcadeRunSchema`, `arcadeMetaSchema`, `arcadeLeaderboardResponseSchema` in `src/lib/schemas.ts` |

Do not claim blanket Zod on every POST/query — only these trust boundaries are validated today.

### 5.5 Sync merge (client-authoritative progress)

`server/sync.ts` merge rules:

- Lifetime EP / roll counts / journey: **max** of local vs cloud.
- Collection: union by badge id; keep **earliest** `firstEarnedAt`.
- History: merge by roll id (cap writes per request — `UPSERT_CAP`).
- Side effects (`processRollActivity`) must be **non-fatal** to sync success.
- **Integrity gate** (`server/syncIntegrity.ts`): reject (HTTP 409) when history/best-roll ids belong to another user, or EP/collection growth cannot be explained by that user’s rolls (stops localStorage clone dumps).
- **Delta POST (v0.11+):** client may send `mode: 'delta'` with pending rolls only; response is compact ack. Full `{ cloud }` is for GET pull. Payload size capped (`MAX_SYNC_PAYLOAD_BYTES`); auto-sync debounced.

### 5.5b Auth identity

- Prefer Discord/GitHub OAuth for new accounts.
- Email/password: `requireEmailVerification` + Resend from `outreach.chron0.tech`.
- Magic link plugin for passwordless email sign-in (inbox ownership).
- Grandfather existing users: `node --env-file=.env.local scripts/grandfather-email-verified.mjs`.

### 5.5c Progress provenance (profiles)

`classifyProgressProvenance` labels public profiles **Cloud sync** vs **Cloned local progress** (best-roll id owned by someone else / missing) vs **Local progress**.

### 5.6 Roll UI (Home reel)

Known footgun (fixed once; do not reintroduce):

- Mode switch clears the board (`slotValue = null`, `revealKey = 0`).
- `NumberDisplay` must reset **internal** `lastRevealKey` when the board clears / remounts.
- Remount reel on mode change (`key={reelMountKey}`) so Free/Ranked keep working after Daily/Weekly.
- Use a **sync** in-flight guard (`rollInFlightRef`) in addition to React `rolling` state so Generate is not stuck.

`roll:ok` in logs with a stuck `?????` reel is almost always a UI reveal race, not RNG failure.

### 5.7 Notifications

- **Activity:** personal (follows, unlocks, overtaken).
- **System:** broadcasts + Ranked crown messages.
- Opening **System messages** should mark the **whole** system inbox read (no per-item click required).
- Activity stays manual mark-read.
- **Display-layer crown grouping** (`src/lib/inboxPresentation.ts`): same-roll today/week/all-time `overtake-*` / `best-*` rows render as one card; mark-read PATCHes all member ids. Unread tab / Alerts badge counts use grouped presentations. Do not change server writers for this UX.

### 5.8 Product refusals

Do **not** implement hate-symbol or white-supremacy easter eggs / badges (e.g. 1488 “White Power”, “Grand Wizard”). Refuse and offer neutral alternatives only if the user wants an unrelated easter egg.

---

## 6. Schema & migrations

Primary schema: `server/db/schema.ts`.

Important tables: `user` (username, vanity profile fields), `user_progress`, `rolls` (+ `source`, `short_code`, attestation, `challenge_key`), `arcade_meta`, `arcade_runs`, `arcade_run_rolls`, `follows`, `notifications`, `system_messages`, `system_message_reads`, `rate_limits`, Better Auth tables.

**Production safety:**

1. Prefer additive `ALTER TABLE ... IF NOT EXISTS` scripts.
2. If `drizzle-kit push` asks to **truncate** `rolls` for a unique constraint, stop and use an additive path unless the user explicitly accepts data loss.
3. After schema changes used by Ranked/leaderboards, verify column exists (e.g. `rolls.source`).

---

## 7. API surface (agents)

| Endpoint                                               | Notes                                                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/*`                                          | Better Auth (rewrites with `__path` for multi-segment)                                                                     |
| `/api/sync`                                            | GET full cloud pull; POST delta (or legacy full) → compact ack; soft per-minute burst; 256KB body cap                      |
| `/api/ranked-roll`                                     | POST Ranked free play (auth + username); response includes `quota` metadata                                                |
| `/api/ranked-roll/quota`                               | GET read-only Ranked remaining / reset (auth; soft burst `rankedQuotaPerMinute`)                                           |
| `/api/leaderboard`                                     | `?view=total\|best` (default total); `?scope=ranked\|practice&period=all\|week`; total: `sort=`; best: `sortBy=ep\|rarity` |
| `/api/arcade`                                          | GET meta + active run (auth)                                                                                               |
| `/api/arcade/start\|roll\|buy\|arm\|cash-out\|abandon` | Arcade run mutations (auth + @username for start/roll)                                                                     |
| `/api/arcade/leaderboard`                              | Best Digits run score (optional auth for `me`)                                                                             |
| `/api/feature-requests`                                | GET list / POST submit (signed-in); vote via `/api/feature-requests/:id/vote`                                              |
| `/api/admin/feature-requests`                          | PATCH status (`requireAdmin` + audit)                                                                                      |
| `/api/highlights`                                      | Community bests — **Ranked only**                                                                                          |
| `/api/feed`                                            | `?source=all\|ranked\|practice` — self + following                                                                         |
| `/api/follow`                                          | Follow graph                                                                                                               |
| `/api/notifications`                                   | Activity + system inbox                                                                                                    |
| `/api/system-messages`                                 | GET list; POST **admin session** (role=admin). Still live alongside `api/admin/broadcast.ts` — redundant POST not removed. |
| `/api/admin/*`                                         | Admin: broadcast, stats, users search/wipe/ban, reports                                                                    |
| `/api/reports`                                         | Signed-in users file abuse / username reports                                                                              |
| `/api/challenge`                                       | Period seeds metadata                                                                                                      |
| `/api/attest`                                          | Optional HMAC seal on claim                                                                                                |
| `/api/og`, `/api/share/*`, `/api/u/*`, `/api/page/*`   | OG / share / profile / static-page HTML for bots                                                                           |
| `/api/rolls/:id`                                       | Public roll lookup for share gate                                                                                          |
| `/api/health`                                          | Liveness + env presence                                                                                                    |

SPA routes: History API in `src/lib/routes.ts`; Vercel rewrites non-`/api` to `index.html`. Bot UA rewrites for `/s/:user/:code` and `/u/:username`.

---

## 8. Frontend conventions

- **Styling:** Tailwind v4 utility classes + CSS vars (`--bg`, `--prose`, `--outline`, …) in `src/styles/global.css`.
- **Segmented controls:** use `SegmentedToggle` for simple scope/lane chips (Leaderboard Total EP/Best Roll, Features Top/Newest, History, Admin, Notifications). **Do not** migrate `RollModePicker` radio cards or `CollectionScreen` family-filter chips — those stay bespoke by design.
- **Fonts:** Outfit (UI), Syne (display), JetBrains Mono (numbers).
- **Client API wrappers:** screens and components must use `src/lib/*-api.ts` (`leaderboard-api`, `profile-api`, `me-api`, `roll-api`, `highlights-api`, `sync-api`, `notifications-api`, `admin-api`, …). **Never** call `fetch('/api/...')` directly from `src/ui/**` (blob/`dataUrl` fetches for PNG export are fine).
- **TanStack Query:** `QueryClientProvider` in `src/main.tsx`. Use `useQuery` for cached reads — leaderboard, feed, highlights, profile, feature-requests, admin-check (`useIsAdmin`). Feature request submit/upvote use `useMutation` (optimistic upvote). Some screens (notifications, account) still use effects + wrappers.
- **State:** `GameProvider` mounts three contexts — `useGame` (rolls/history/collection), `useGameSettings`, `useCloudSync`. Cloud sync orchestration lives in [`src/state/useSync.ts`](./src/state/useSync.ts) (`enqueueAutoSync`, `applyCloudPayload`, `syncToCloud`, `pullFromCloud`, `waitForCloudPublish`). Settings setters live in `src/state/settings.ts`.
- **Logging:** `createLogger('area')` → `[rngdle:area]` in browser/Vercel logs. Optional `window.__rngdleLog`.
- **Share:** no public vanity URL until `waitForCloudPublish` confirms the roll row exists.
- **Copy:** keep Free vs Ranked board placement language consistent (About, RollModePicker, Leaderboard, README).

When changing product behavior, update:

1. In-app About / mode picker / leaderboard blurb
2. `README.md`
3. `docs/ARCHITECTURE.md` if trust model or flow diagrams change

GitHub Mermaid: avoid `<br/>`, unicode middle-dots, and heavy path punctuation in node labels (GitHub’s renderer is strict).

---

## 9. Testing & verification

- Unit tests live next to engine files (`src/game/*.test.ts`) via `pnpm test`.
- After game-rule changes: `pnpm test` + `pnpm typecheck`.
- After API/schema: local `vercel dev` or deploy preview; hit `/api/health`; exercise Ranked once signed in with username.
- Do not treat browser-extension noise (`Receiving end does not exist`, `content.js`) as app bugs.

**Success criteria for roll modes after UI work:**

1. Free → Generate settles digits.
2. Daily → Generate settles (deterministic).
3. Switch Free → Generate still settles (mode-switch reel remount).
4. Ranked (signed in + username) → Generate settles and appears under History → Ranked.

These four checks require a **manual browser smoke** — automated `pnpm test` / `pnpm typecheck` do not cover reel settle or mode-switch UX. Do not mark this checklist complete in docs or release notes without explicit smoke evidence.

---

## 10. Git & release hygiene

- Default branch: `main` (production via Vercel).
- Prefer small, focused commits with complete sentences in messages.
- Do not force-push `main` unless the user explicitly requests it.
- Version in `package.json` (currently **0.16.0**); Settings footer reads `VITE_APP_VERSION` from the build.
- Releases: annotated tags (`v0.x.y`) + `gh release create` when the user asks.

---

## 11. Common failure modes (quick diagnosis)

| Symptom                                                       | Likely cause                                    | Fix direction                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ranked `FUNCTION_INVOCATION_FAILED` / missing `rarity` module | ESM extensionless import in `src/game`          | Add `.js` extensions; `pnpm typecheck` (NodeNext) should fail before deploy           |
| Ranked 500 after auth                                         | Insert insert / missing `source` column         | Run `scripts/add-roll-source.mjs`                                                     |
| Free play sync `429` hourly upload                            | Old hourly cap                                  | Removed — only soft per-minute sync burst remains                                     |
| Reel stuck on `?????` after Daily/Weekly                      | `lastRevealKey` collision                       | Remount reel + reset lastRevealKey (see §5.6)                                         |
| Feed only one user / rare only                                | Old rare+ filter + no self                      | Feed includes self; all rarities; source toggles                                      |
| Leaderboard empty                                             | Wrong scope / no username / no Ranked rolls yet | Check scope toggle + `@username` + mode                                               |
| Admin Users shows name without `@` / missing from boards      | `user.username` null (OAuth `name` only)        | Admin **Edit** or `node --env-file=.env.local scripts/backfill-usernames.mjs --apply` |
| Share stuck “waiting for cloud”                               | Roll not in Neon                                | Sign in, sync; confirm `/api/rolls/:id`                                               |

---

## 12. What “done” looks like for a feature PR

1. Typecheck clean (`pnpm typecheck`).
2. Relevant tests pass (`pnpm test`).
3. Trust model preserved (no client forging Ranked).
4. Copy/docs updated if user-facing.
5. No secrets or local debug junk committed.
6. If schema changed: additive migration path documented or scripted.
7. Manual smoke of Free + Ranked + mode switch if roll UI touched.

---

## 13. Key files cheat sheet

| Concern                  | Start here                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Roll orchestration       | `src/state/GameProvider.tsx`                                                                                        |
| Cloud sync orchestration | `src/state/useSync.ts`, `useCloudSync`                                                                              |
| Client API wrappers      | `src/lib/*-api.ts` (esp. `roll-api`, `leaderboard-api`, `profile-api`)                                              |
| Zod schemas              | `src/lib/schemas.ts`, `server/sync.ts`                                                                              |
| QueryClient              | `src/main.tsx`                                                                                                      |
| Handler guards           | `server/apiGuards.ts`                                                                                               |
| Read pipelines           | `server/leaderboard.ts`, `profile.ts`, `feed.ts`, `ogSvg.ts`                                                        |
| Reel animation           | `src/ui/components/NumberDisplay.tsx`, `HomeScreen.tsx`                                                             |
| Mode picker copy         | `src/ui/components/RollModePicker.tsx`                                                                              |
| Badge catalog            | `src/game/badges/catalog.ts`                                                                                        |
| Ranked issue             | `server/rankedRoll.ts`, `api/ranked-roll/index.ts`, quota: `api/ranked-roll/quota.ts` + `server/rankedQuota.ts`     |
| Crowns / overtake        | `server/rollActivity.ts`                                                                                            |
| Sync merge               | `server/sync.ts`, `api/sync.ts`                                                                                     |
| Leaderboards             | `server/leaderboard.ts`, `api/leaderboard.ts`, `LeaderboardScreen.tsx` (Ranked/Practice/Arcade)                     |
| Feature requests         | `server/featureRequests.ts`, `api/feature-requests*`, `FeatureRequestsScreen.tsx`                                   |
| Arcade Mode              | `src/game/arcade/`, `server/arcade.ts`, `arcadeLeaderboard.ts`, `api/arcade/*`, `ArcadeScreen.tsx`, `arcade-api.ts` |
| Feed                     | `server/feed.ts`, `api/feed.ts`                                                                                     |
| Schema                   | `server/db/schema.ts`                                                                                               |
| Architecture             | `docs/ARCHITECTURE.md`, `docs/refactor-notes-2026-07.md`                                                            |
| Player What’s new        | `src/lib/whats-new.ts`, `WhatsNewScreen.tsx` (`/whats-new`)                                                         |
| Notifications inbox UI   | `NotificationsScreen.tsx`, `NotificationRow.tsx`, `src/lib/inboxPresentation.ts`                                    |
| Features board UI        | `FeatureRequestsScreen.tsx`, `--feature-*` tokens in `global.css`, shared `SectionHeader`                           |
| Developer changelog      | `CHANGELOG.md`                                                                                                      |

---

_When instructions conflict: user request > this file > README > older design docs. Prefer the current dual-board Ranked/Practice model over any pre-Ranked “all synced rolls are competitive” wording in historical specs._
