> **Status (July 2026):** §§A–G below are the **historical pre-refactor audit**. The prioritized work **landed** on `main` (`aa8e91e`…`fc4fa65`). Treat **§H** and [`HANDOFF.md`](../HANDOFF.md) §1b / [`refactor-notes-2026-07.md`](./refactor-notes-2026-07.md) as current truth — do not quote §§D–G as a pending to-do list.

# RNGdle Unlocked — Architecture Audit

**Scope:** every file in `src/`, `api/`, `server/` (127 files, ~22.2K LOC) read in full, plus `AGENTS.md`, `README.md`, `HANDOFF.md`, and all build config. Read-only — no changes made.

## Overall verdict

The bones are good and the docs are largely honest. The three hardest things to get right in this stack are **right**: `src/game/` is genuinely pure (no React/DOM imports outside the sanctioned `fx.ts`), the ESM `.js`-extension discipline in the serverless engine graph is **100% clean** (the single most-cited production footgun in `HANDOFF.md` is fully honored in code), and scoring is never reimplemented in the UI/state layers.

The debt is almost entirely **inconsistent adherence to patterns that already exist**: a `lib/*-api.ts` network layer that half the screens bypass with raw `fetch()`; a `badge-theme.ts` rarity-style module that three components ignore; a `HISTORY_CAP`/`ROLL_RANGE` constant re-hardcoded a few files over; and two god-files (`GameProvider.tsx`, `AccountScreen.tsx`) that accreted responsibilities. No true Blocker (nothing is actively producing wrong output today), but there is one latent-Blocker-class tooling gap that has _already_ caused repeated production incidents and will again (§G1).

### Doc-vs-code discrepancies

| Doc claim                                                           | Reality                                                                                                                                                                                                                                                                                                                                   | Where |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `AGENTS.md §2`: "`api/*` Thin handlers → `server/*`"                | **Half-true.** Write-side (`sync`, `ranked-roll`, `attest`) obeys it; **read-side handlers are fat** — `api/leaderboard.ts` (361 LOC), `api/profile/[username].ts` (236), `api/og.ts` (284), `api/feed.ts`, `api/notifications.ts` embed full query pipelines. No `server/leaderboard.ts` / `server/profile.ts` / `server/feed.ts` exist. | §C    |
| `AGENTS.md §5.3` / `HANDOFF §6.1`: relative game imports need `.js` | **Honored everywhere** — verified clean across the whole `src/game→server/api` graph. Docs match code.                                                                                                                                                                                                                                    | §G    |
| `AGENTS.md §5`: `src/game` pure, no React/DOM at import time        | **Honored.** Only `fx.ts` (sanctioned) and one `window.location` runtime read in `shareText.ts:70` (guarded).                                                                                                                                                                                                                             | §C    |
| `README`: "runtime validation / fairness" framing                   | No `zod` or runtime schema anywhere in app code (`zod` present only transitively under `better-auth`). Every trust boundary is a hand cast.                                                                                                                                                                                               | §E    |

---

## A. File & Module Bloat

| File                                                                             | Finding                                                                                                                                                                                                                                                                                                      | Sev    | Why it matters                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/game/badges/catalog.ts](src/game/badges/catalog.ts) (1255)                  | Mostly flat badge _data_ (correct shape) — but ~6 inline matcher/highlight closures break the "logic lives in `matchers.ts`/`highlights.ts`" convention: `sandwich` (707), `mirror-bookends-2` (1132), `symmetric-sum` (1178), `chaos-theory` (1165), bitstream `/^[01]+$/` (1103, 1240).                    | Low    | Keeps the catalog from being pure declarative data; readers must scan 1200 lines for stray logic.                                                                                     |
| [src/state/GameProvider.tsx](src/state/GameProvider.tsx) (816)                   | **God-hook.** Owns roll orchestration (3 modes), the coalescing auto-sync queue, attestation, import/export, `applyTheme` DOM writes (123-129), 7 near-identical setters (539-566), celebration FX, and the `waitForCloudPublish` poll loop (677-732). The context `useMemo` (734-807) has ~30 dependencies. | High   | Any consumer re-renders on any field change; the file is the single hardest thing in the app to reason about or test. Clear seams → `useSync`, `useSaveTransfer`, a settings reducer. |
| [src/ui/screens/AccountScreen.tsx](src/ui/screens/AccountScreen.tsx) (959)       | One component = magic-link auth + password auth + social OAuth + account linking + username save + vanity editor (avatar/accent/flair/bio/codex) + admin probe + cloud-sync controls. 5 `fetch` calls, ~10 `useState`.                                                                                       | High   | No flow is independently testable; editing the bio editor risks breaking auth. Splits: `AuthPanel`, `LinkedAccountsPanel`, `ProfileLookEditor`, `CloudSyncPanel`.                     |
| [src/ui/screens/ProfileScreen.tsx](src/ui/screens/ProfileScreen.tsx) (903)       | Screen also contains the `Profile` DTO (23-89), an inline `BADGE_CATALOG` map rebuilt at module load (91-124), `asRarity`, `fmtDate`, and 4 follow calls.                                                                                                                                                    | High   | DTO + catalog + network + view in one file; the DTO belongs in a `lib/profile-api.ts`.                                                                                                |
| [api/leaderboard.ts](api/leaderboard.ts) (361)                                   | `rankedBoard` / `practiceBoard` / `findMe` / `publicEntry` — two full board query pipelines, ranking, sort dispatch, "me" resolution. A service masquerading as a handler.                                                                                                                                   | High   | Untestable without HTTP; the core AGENTS.md violation.                                                                                                                                |
| [api/profile/[username].ts](api/profile/[username].ts) (236)                     | `defineHandler` body does user lookup, progress parse, collection sanitize, secret seals, provenance, roll count, recentRolls mapping inline.                                                                                                                                                                | High   | ~200 lines of domain logic in a route file.                                                                                                                                           |
| [src/ui/screens/CollectionScreen.tsx](src/ui/screens/CollectionScreen.tsx) (663) | `numberList`/`journeyList`/`secretList` (116-178) are three near-identical filter+sort memos differing only by source; `SecretCard` (500-663) is a large second component in-file.                                                                                                                           | Medium | Collapse into one parameterized `filterBadges()`.                                                                                                                                     |
| [server/rollActivity.ts](server/rollActivity.ts) (379)                           | Mixes crown DB queries + overtake detection + notification writes + **all user-facing copy** (`crownPeriodCopy`, `summarizeBadges`).                                                                                                                                                                         | Medium | Can't change crown wording without touching query code.                                                                                                                               |
| [api/notifications.ts](api/notifications.ts) (214)                               | GET inbox assembly + PATCH mark-read (per-tab, markAll, per-id) all inline.                                                                                                                                                                                                                                  | Medium | Mark-read logic belongs in `server/notifications.ts`.                                                                                                                                 |
| [api/og.ts](api/og.ts) (284)                                                     | Two large SVG templates + a live DB profile fetch + format helpers in the handler.                                                                                                                                                                                                                           | Medium | SVG rendering + DB access belong in `server/ogSvg.ts`.                                                                                                                                |

`HomeScreen.tsx` (468) is large but justified (it genuinely is the reveal state machine + FX/share timing) — not flagged for splitting.

---

## B. Duplication & Repetition

**Highest-impact — a date formatter copied 8 times.** Identical `new Date(iso).toLocaleString()` with try/catch:
[ProfileScreen.tsx:139](src/ui/screens/ProfileScreen.tsx#L139), [HistoryScreen.tsx:10](src/ui/screens/HistoryScreen.tsx#L10), [ShowcaseScreen.tsx:8](src/ui/screens/ShowcaseScreen.tsx#L8), [BestRollCard.tsx:9](src/ui/components/BestRollCard.tsx#L9), [RollReplayModal.tsx:6](src/ui/components/RollReplayModal.tsx#L6), [NotificationsScreen.tsx:268](src/ui/screens/NotificationsScreen.tsx#L268), [LatestRunsPanel.tsx:21](src/ui/components/LatestRunsPanel.tsx#L21), [CollectionScreen.tsx:46](src/ui/screens/CollectionScreen.tsx#L46). **Sev: Medium** — any locale/relative-time change is 8 edits.

**Rarity handling scattered despite a canonical home.** `game/rarity.ts` already exports `RARITY_THRESHOLDS`/`RARITY_LABELS` and `lib/badge-theme.ts` centralizes `RARITY_PILL`, yet:

- `asRarity` is duplicated **byte-for-byte** in `ProfileScreen.tsx:147` and `CommunityHighlights.tsx:288`. (Medium)
- Rarity ordering re-derived 4×: `StatsScreen.tsx:6 RARITY_ORDER`, `HistoryScreen.tsx:18 RARITY_RANK`, plus both `asRarity` arrays. (Medium — add a tier and some screens sort wrong.)
- Rarity→class maps live inline instead of in `badge-theme.ts`: `NumberDisplay.tsx:29 RARITY_GLOW`, `StatsScreen.tsx:16 RARITY_BAR`, `CommunityHighlights.tsx:301 rarityRing()`. (Medium)
- `RarityBadge.tsx:4 LABELS` duplicates `RARITY_LABELS`. (Low)

**Stat tile built 3×:** `ProfileScreen.tsx:885 Stat`, `StatsScreen.tsx:203 Tile`, `ShowcaseScreen.tsx:150 StatCard`. (Medium)

**Segmented-toggle class cluster** (`border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]` active vs inactive) hand-repeated in ~9 places: `LeaderboardScreen:516`, `HistoryScreen:224-260`, `CollectionScreen:200-252`, `NotificationsScreen:189`, `AdminScreen:183`, `LatestRunsPanel:146`, `RollModePicker:66`, `AppShell` nav, `ThemeToggle`. The Ranked amber accent (`bg-amber-500 text-black`) is itself copied 4×. (Medium)

**Server-side duplication:**

- **JSON-body parse block** (`try { body = await request.json() } catch { 400 }`) copy-pasted in **11 handlers** (`follow`, `notifications`, `attest`, `reports`, `system-messages`, `me`, `admin/broadcast`, `admin/reports`, `admin/users/ban`, `admin/users/wipe`, `sync`). (Medium)
- **Auth preamble** (`createAuth()` → `getSession` → 401) repeated in ~10 handlers — and `server/session.ts:4 getSessionUser` was built for exactly this but is imported by **nobody** (§F). (High-leverage)
- **Rate-limit guard** (8-line `checkRateLimit`+`rateLimitedResponse`) repeated in ~15 handlers. (Medium)
- **Ranked filter triplet** (`isPublic=true` + `source='ranked'` + `username IS NOT NULL`) built 4× (`rollActivity.ts:207`, `highlights.ts:127/149`, `leaderboard.ts:155`). (Medium — the competitive-fairness rule; a drift here is a fairness bug.)
- **Badge-JSON parse-sort-slice-map** copied in `profile/[username].ts:193`, `highlights.ts:170`, `share/[id].ts:71`, `rollActivity.ts:354`. (Medium)
- **Path-tail parsing** (`pathname.split('/').filter(Boolean)`) reimplemented 4× (`profile`, `u`, `share`, `rolls`). (Medium)
- `escapeHtml` (`server/ogHtml.ts:65`) vs `escapeXml` (`api/og.ts:278`) — identical. Short-code-collision retry duplicated (`sync.ts:232` vs `rankedRoll.ts:90`). (Low)

**Domain-logic dupes:** `rollLane()` identical in `HistoryScreen.tsx:63` and `LatestRunsPanel.tsx:15`; `uniqueDigitCount` identical in `highlights.ts:111` and `matchers.ts:183`; three identical EP-sum reducers (`score.sumEP`, `journey.sumJourneyEP`, `secrets.sumSecretEP`); `journeyHits`≈`secretHits`. (Low–Medium)

**Magic numbers not centralized:**

- `HISTORY_CAP` exists (`storage.ts:9`) but `GameProvider.tsx:689` hardcodes `.slice(0, 500)`. (Medium)
- `ROLL_RANGE` exists (`rng.ts:5`) but `challenge.ts:120` hardcodes `% 1_000_001`. (Medium — two places must agree on range size.)
- `server/sync.ts:338` hardcodes `1_000_000` instead of the engine's `ROLL_MAX`. (Low)
- Week `7*24*60*60*1000` in 4 files; title/body caps (`.slice(0,200)`/`8000`) inconsistent between the two broadcast paths; rate window `60_000` everywhere. (Medium)
- **localStorage key prefix `rngdle-unlocked:v1:`** hand-typed across 4 files: `storage.ts:12` (registry), `GameProvider.tsx:356` (guest key, inlined), `notifications-api.ts:98`, `onboarding.ts:1`. (Medium — no single migration point.)

---

## C. Layer Violations

**C1 — Direct `fetch()` inside components (15 real violations).** A typed `lib/*-api.ts` layer exists (`sync-api`, `notifications-api`, `admin-api` — all with `withTimeout`, logging, discriminated results) but these screens bypass it:

| File:line                                            | Endpoint                        | Note                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------- |
| `AccountScreen.tsx:93,306,389,418`                   | `GET/PATCH /api/me`             | no wrapper; inline casts                                                                                                                                                          |
| `ProfileScreen.tsx:247,319,327`                      | `/api/follow` GET/POST/DELETE   | **wrappers already exist** (`followUser`/`unfollowUser`/`fetchFollowingUsernames` in `notifications-api.ts`) and are used by other screens — ProfileScreen hand-rolls them anyway |
| `ProfileScreen.tsx:224`                              | `GET /api/profile/:u`           | + untyped (E1)                                                                                                                                                                    |
| `LeaderboardScreen.tsx:92,142`                       | `/api/leaderboard`, `/api/feed` | no wrapper                                                                                                                                                                        |
| `CommunityHighlights.tsx:62`                         | `/api/highlights`               | + module-level mutable cache (C3)                                                                                                                                                 |
| `PublicRollScreen.tsx:49`                            | `/api/rolls/:id`                | no wrapper                                                                                                                                                                        |
| `AccountScreen:133`, `AppShell:98`, `AdminScreen:35` | `GET /api/admin/broadcast`      | **admin-probe hack** — `setIsAdmin(r.ok                                                                                                                                           |     | r.status===405)`triplicated;`admin-api.ts` exists |

_(`ShareCard.tsx:105 fetch(dataUrl)` is a PNG blob conversion — not a violation.)_
This is the single biggest consistency gap. **Sev: High** (pattern) — individual sites Medium.

**C2 — Business logic in UI:** `HistoryScreen.tsx:63 rollLane` + `74 sortHistory` + `18 RARITY_RANK` and `LatestRunsPanel.tsx:15 rollLane` are game-domain classification living in view code (belongs in `src/game/history.ts`). `HomeScreen.tsx:303` derives a secret-badge image path inline (`/secrets/${id.replace('secret-master-','')}.jpg`) while other screens read `secret.image` from the model — if the id scheme changes, Home breaks silently. `StatsScreen.tsx:48-79` computes EP/hour + 28-day calendar in the view. **Sev: Medium.**

**C3 — State outside `src/state`:** `CommunityHighlights.tsx:33 let highlightsCache` — module-level mutable cache (documented "soft session cache," but it's app state in a component module). **Sev: Low.**

**C4 — `GameProvider` bypasses its own lib layer:** cloud save goes through `lib/sync-api.ts`, but `fetch('/api/ranked-roll')` (321), `fetch('/api/attest')` (473) and `fetch('/api/rolls/:key')` (708) are inlined in the provider. **Sev: Medium** — inconsistent with the abstraction it otherwise uses.

**Clean:** no `server/*` imports from `src/ui` (verified); all 25 `api/*` handlers use `defineHandler` (contract satisfied).

---

## D. Missing Abstractions (named suggestions)

**Client:**

- `src/lib/format.ts` → `formatDateTime(iso)` + `formatRelative(iso)`. Kills the 8 date-formatter copies (B).
- `src/ui/components/StatTile.tsx` → `{label, value, sub?}`. Replaces 3 stat-tile impls.
- `src/ui/components/SegmentedToggle.tsx` (or generalize `ThemeToggle`, which is already one) → `{options, value, onChange, accent?}` with the Ranked amber as a variant. Replaces ~9 inline toggles.
- `src/lib/leaderboard-api.ts` (+ feed/highlights/rolls/me) → `fetchLeaderboard`, `fetchFeed`, `fetchHighlights`, `fetchPublicRoll`, `fetchMe`/`patchMe`, `checkIsAdmin()`. Removes every C1 violation.
- `src/game/rarity.ts` additions → one `RARITY_ORDER` + `coerceRarity(s)`; move `RARITY_GLOW`/`RARITY_BAR`/`rarityRing` into `badge-theme.ts`.
- `src/game/history.ts` → `rollLane`, `sortHistory`, `filterByLane` (removes C2 + B8).
- `src/state/useSync.ts` → extract `enqueueAutoSync`/`applyCloudPayload`/`syncToCloud`/`pullFromCloud`/`waitForCloudPublish` + refs from `GameProvider` (~250 lines, ~10 memo deps).
- `src/lib/storage-keys.ts` → one registry for the `rngdle-unlocked:v1:*` namespace (incl. inlined guest/webNotify/onboarding keys) + shared `readJSON`/`writeJSON`.
- `src/game/constants.ts` → the tier ladder shared by `rarity.ts` and `percentile.ts` (see E/B).

**Server:**

- `server/apiGuards.ts` → `requireUser(request)`, `readJson<T>(request)`, `rateGuard(...)`. Collapses the 11× JSON-parse, ~10× auth preamble, ~15× rate-limit blocks — and finally uses the intent behind the dead `server/session.ts`.
- `server/{leaderboard,profile,feed}.ts` → house the queries now inline in the fat read handlers (fixes C1-server/A1/A3).
- `server/badgeJson.ts` → `parseBadges`/`topBadges` (the 4× parse-sort-slice-map).
- `server/routeParams.ts` → one path-segment extractor.

---

## E. Type Safety Gaps

No runtime validator anywhere in app code — every trust boundary is a hand cast. Notable:

- **`storage.parseImportPayload` (storage.ts:248-291) — High.** User-supplied import file: `stateRaw.history as RollResult[]` / `collection as CollectionEntry[]` are blind casts behind only `Array.isArray`. No per-element check of number ranges, rarity enum, ISO dates, or badge shape. Corrupt/hand-edited saves flow straight into `recomputeBestConsecutive`, `mergeSecretUnlocks`, and rarity display. This is a real trust boundary (file input) — the one place zod earns its keep.
- **`api/sync.ts:72 body as CloudSavePayload` — High.** Largest untrusted payload in the app; only 3 top-level fields checked (77-83); every `history[]` element and `stats` passed unchecked into merge (numeric ranges _are_ clamped at 337-338, but shape is trusted).
- **`ProfileScreen.tsx:226` — High.** `const data = await r.json()` with **no cast at all** → `data` is `any`, and `setProfile(data.profile)` feeds unvalidated network data into typed state. (Every other fetch at least casts.)
- **`storage.readJSON<T>` casts `JSON.parse(raw) as T` — Medium.** Every persisted value trusted on load; numbers get `Number.isFinite`, arrays/objects don't.
- **`session.user as { username?: string | null }` — Medium.** Repeated unsafe assertion at 6 sites (`App.tsx:29`, `AccountScreen:640/641`, `AppShell:111`, `LeaderboardScreen:46`, `ProfileScreen:204`, `ShareCard:34`) + server (`leaderboard:82`, `feed:91`, `follow:91`, `me:71`). Root fix: extend the Better Auth session type once in `lib/auth-client.ts`.
- **10 server handlers** cast request bodies with `as typeof body` + ad-hoc `if` checks; query strings coerced by hand with `Number()`/`.get()` (no schema). DB-derived JSON (`collectionJson`/`statsJson`/`badgesJson`) parsed to `any` inline across ~7 files (only `secretMasteries.parseCollectionIds` is disciplined). **Medium.**

Positive: `any`/`unknown` is genuinely rare (9 hits total in `src/`, mostly `logger.ts`); the badge catalog is fully typed. The gap is _untyped boundaries_, not sloppy internal typing.

---

## F. Dead Code & Cruft

- **`server/session.ts` (whole module) — Medium.** `getSessionUser` exported, imported by nobody. Ironically the exact auth-guard the handlers need.
- **`server/http.ts:39 clientHeader` — Low.** Dead export.
- **`api/users/search.ts:44-46` — Low.** `if (!/regex/.test(...)) { /* comment */ }` — empty body, result discarded. No-op branch.
- **`api/system-messages.ts` POST — Medium.** Its own header says "Replaces secret-header POST"; superseded by `api/admin/broadcast.ts` but still live → redundant privileged surface with divergent rate-limit ordering.
- **Dead engine exports (no non-test caller):** `matchers.hasOnlyDigits` (301), `matchers.uniqueDigitCount` (183, dup), `stats.mergeBestRoll` (134), `entropyPool.getPoolSampleCount` (48), `digits.naturalDigitLength` (26). **Low each, safe deletes.**
- **Dead UI exports:** `BadgePill.tsx:56 rarityTintedPillClass` (ignores its arg via `void rarity`, zero call sites), `badge-theme.ts:91 rarityPillClass` (no callers), pass-through re-exports `BadgePill.tsx:61` / `ProfileScreen.tsx:902`. **Low/Nit.**
- **`BadgeCard.tsx:82 cascadeIndex`** dead prop threaded through two components (`void _cascadeIndex`), still passed by `BadgeBreakdown:329`. **Nit.**
- **Stray dev comment** `catalog.ts:614 // fix: remove the bad exact hello badge...`; **stale doc drift** `secretMasteries.ts:3` cites a `.json` file that's actually `.ts`. **Nit.**
- **Overlapping badges — Low:** `year-2026` (catalog:553, hardcoded 2026) and `year-of-roll` (1243, dynamic `getFullYear()`) both fire in 2026 → double EP + two badges for one concept. Worth a product decision.

---

## G. Architecture-Level Observations

**G1 — The api/server tsconfig uses `moduleResolution: "bundler"`, which is the root cause of the recurring Ranked outage. High (latent Blocker).**
[tsconfig.json](tsconfig.json) (covering `api/**` + `server/**`) sets `"moduleResolution": "bundler"`. Under bundler resolution, extensionless relative imports typecheck fine — but the code runs on Node ESM under Vercel `/var/task`, which requires `.js`. So `pnpm typecheck` is **green while production breaks** (`Cannot find module '/var/task/src/game/rarity'`). This is exactly the incident documented in `HANDOFF.md §2` and `AGENTS.md §5.3` / §11. The team currently prevents it by manual discipline (and, credit due, has done so perfectly). Switching this one tsconfig to `nodenext` (or `node16`) makes tsc **enforce** the `.js` rule at compile time, converting a repeat production incident into a build error. This is the highest-value structural fix in the report.

**G2 — Read-side API boundary is misplaced.** Write-side respects `api→server`; read-side doesn't (§C). The fix isn't a rewrite — it's moving existing query blocks into new `server/{leaderboard,profile,feed}.ts` files, verbatim.

**G3 — No path aliases.** No `paths` in any tsconfig; everything is relative. Screens reach `../../lib/...` and there are `../../../` chains. A single `@/*` → `src/*` alias would flatten imports and reduce churn when files move. Note the deliberate asymmetry: `src/game` internal imports use `.js` (for the serverless graph) while `src/state`/`src/lib` consumers import `../game` **without** `.js` — correct given bundler resolution, but a source of "which style do I use here?" confusion. Document it or alias around it.

**G4 — App/node tsconfigs enforce `noUnusedLocals`/`noUnusedParameters`; the api/server tsconfig does not.** This is _why_ the dead server exports in §F (`session.ts`, `http.ts`) accumulate silently while UI dead code has to be actively hidden (`void _cascadeIndex`). Adding the two flags to `tsconfig.json` surfaces server dead code for free.

**G5 — `postinstall: node scripts/patch-typescript-api.cjs`** patches TypeScript itself (repo runs `typescript@7.0.2` + `@typescript/typescript6` native preview). Fragile — a monkey-patch of the toolchain on every install is a supply-chain and upgrade-brittleness risk. Worth documenting what it patches and a removal plan when TS 7 stabilizes.

**G6 — `SAVE_VERSION = 2` but keys are `:v1:` and there is no migration path.** `storage.ts` writes `version: 2` in exports and bumps `SAVE_VERSION`, but `parseImportPayload` ignores `version` entirely and load keys stay `v1`. The version field is currently decorative — either wire a migration or drop the pretense. **Low.**

**G7 — 40-field context value.** `GameContextValue` (74-119) exposes 40 members through one context. Splitting settings/sync/roll into separate contexts would cut re-renders and shrink the memo dependency array. **Medium** (perf + readability).

---

## Step 4 — Severity distribution

- **Blocker (active bug / blocks scaling now):** none found.
- **Latent-Blocker:** G1 (typecheck can't catch the `.js` footgun that has repeatedly taken down Ranked).
- **High:** GameProvider god-hook, AccountScreen/ProfileScreen bloat, fat read-side handlers (A/C), the `fetch()`-in-components pattern (C1), import/sync/ProfileScreen validation (E), the `apiGuards`/auth-preamble duplication (B/D), G4.
- **Medium:** date-formatter ×8, rarity helper scatter, stat tile ×3, segmented toggle ×9, server JSON/rate/filter duplication, magic-number drift (`HISTORY_CAP`/`ROLL_RANGE`), session-cast ×6, key-prefix scatter, redundant broadcast endpoint, G3/G7.
- **Low / Nit:** dead exports (F), stray comments, overlapping year badges, EP-sum reducers, `SAVE_VERSION`, catalog inline closures.

---

## Step 5 — Prioritized top 10 (fix in this order)

1. **Switch `tsconfig.json` (api/server) to `nodenext` module resolution (G1).** One-line config change that converts a _recurring production Ranked outage_ into a compile-time error. Nothing else on this list prevents a live incident; this does. Highest ROI in the repo.
2. **Add a `server/apiGuards.ts` (`requireUser`/`readJson`/`rateGuard`) and adopt it (B/D/F1).** Collapses the 11× body-parse, ~10× auth preamble, ~15× rate-limit blocks, revives the dead `session.ts` intent, and makes every handler readable. Biggest server-side diff reduction.
3. **Route the 15 component `fetch()` calls through `lib/*-api.ts`; delete ProfileScreen's 4 follow calls outright (C1).** The wrappers already exist — this is pure consistency payoff and immediately shrinks the two god-screens. Start here on the client because it unblocks #4 and #6.
4. **Validate the three real trust boundaries: `parseImportPayload`, `api/sync` body, `ProfileScreen` `.json()` (E).** These are the only places untrusted data enters typed code paths; the import path is user-editable. Do it before splitting files so the validators land in the right layer.
5. **Move read-side query pipelines into `server/{leaderboard,profile,feed}.ts` (A/C/G2).** Resolves the actual AGENTS.md violation and makes the read side testable — mechanical cut/paste, no behavior change.
6. **Extract `useSync` from `GameProvider` and split the context (A/G7).** Removes ~250 lines and ~10 memo deps from the hardest-to-reason-about file and cuts re-renders. Do after #3 so the ranked/attest fetches move into the lib layer at the same time.
7. **Fix the Better Auth session type once in `auth-client.ts` (E/D7).** Deletes 10 `as { username }` casts across client and server in one edit — cheap, high readability gain.
8. **Consolidate rarity + `format.ts` + `StatTile` (B/D).** `game/rarity.ts` gains `RARITY_ORDER`/`coerceRarity`, `badge-theme.ts` absorbs the stray class maps, one date util replaces 8 copies, one `StatTile` replaces 3. Removes the most copy-paste per line of new code.
9. **Kill magic-number drift: `HISTORY_CAP`, `ROLL_RANGE`, `ROLL_MAX`, and a `storage-keys.ts` registry (B).** These are correctness-adjacent (two places that must agree on a range/cap); constants already exist — just import them.
10. **Delete dead code (F) as you touch each file.** `session.ts` intent now used (#2), `http.ts:clientHeader`, the 5 engine exports, the UI dead exports, the no-op search branch, stray comments. Zero-risk cleanup; do it opportunistically alongside 1–9 rather than as a separate pass.

Items 1, 2, 4, 7, 9 are small and mostly independent — a strong first PR. Items 3, 5, 6, 8 are the larger structural refactors and should each be their own reviewed change. Nothing here requires touching game-rule behavior, RNG, or API contracts.

---

## H. Implementation status (July 2026 — landed on `main`)

The prioritized top-10 refactor **was implemented** in 11 commits (`aa8e91e`…`fc4fa65`). This section records **actual end-state deltas** — do not quote §D–G above as a pending to-do list.

| Audit item | Status |
| ---------- | ------ |
| G1 NodeNext for api/server | **Done** — `tsconfig.server.json` + solution root |
| #2 `apiGuards` | **Done** |
| #3 lib `*-api.ts` + React Query | **Done** |
| #4 Zod trust boundaries | **Done** — import, sync, profile |
| #5 read-side `server/*` pipelines | **Done** |
| #6 `useSync` + context split | **Done** |
| #7 session type extension | **Done** |
| #8 format / StatTile / SegmentedToggle / rarity | **Partial** — see below |
| #9 constants + `storage-keys.ts` | **Done** |
| #10 dead code sweep | **Done** |

**Intentional deviations (not bugs):**

- **`PATCH /api/me` malformed JSON** → HTTP **400** (`readJson`), not 500.
- **Corrupt save imports** → `Invalid save file: …`; valid legacy exports still work.
- **`SegmentedToggle`** adopted in Leaderboard, History, Admin, Notifications, etc. — **not** in `RollModePicker` or `CollectionScreen` family chips.
- **`POST /api/system-messages`** — **still present**; audit §F flagged redundancy with `api/admin/broadcast.ts` but removal was out of scope.
- **§9 roll-mode smoke checklist** — **not verified in-repo**; `pnpm typecheck` / `pnpm test` / `pnpm build` pass, but AGENTS.md four-point browser smoke still required before claiming release-ready reel UX.

See [`HANDOFF.md`](../HANDOFF.md) §1b for the canonical handoff summary.
