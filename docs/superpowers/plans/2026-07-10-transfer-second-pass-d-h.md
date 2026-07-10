# Transfer Second Pass (D–H) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Do not start this plan until** real-world transfer is measured after delta sync. PR #7 is **merged to `main`** (2026-07-10); wait for production deploy + ≥24–72h metrics. See [Gate](#gate--when-to-open-this-plan).

**Goal:** Cut remaining non-sync network and Neon waste (notifications polling, fat badge JSON on roll endpoints, leaderboard best-view over-read, unbounded follow GET, TanStack refetch defaults) after sync is no longer ~97% of inbound transfer.

**Architecture:** Each letter is an independent PR. Prefer transport/caching-only changes — never touch RNG, scoring, Ranked trust, or streak merge rules. Reuse existing `src/lib/*-api.ts` wrappers; UI must not call `fetch('/api/...')` directly.

**Tech Stack:** Vite + React 19, TanStack Query, Vercel serverless (`api/*` → `server/*`), Neon Postgres, Zod at trust boundaries.

**Letter collision note:** In this document, **H = QueryClient `staleTime`**. Unrelated historical plan [`2026-07-10-workstream-h-cheap-wins.md`](./2026-07-10-workstream-h-cheap-wins.md) used “H” for badge/secret cheap wins — do not confuse them.

---

## Gate — when to open this plan

Parent audit: payload transfer Phase 1 (Jul 2026). First pass status:

| # | Workstream | Status |
|---|------------|--------|
| 0 | PR #4 sync stopgap | Merged |
| 0b | OG wasm (PR #5) | Merged |
| A | Neon `LIMIT 500` on `loadCloudSave` | Merged (via PR #7) |
| B | Delta sync + compact ack + pull fix | **Merged** ([PR #7](https://github.com/jondmarien/rngdle-unlocked/pull/7)) |

**Open D–H only after:**

1. Production deploy includes PR #7 (confirm Vercel production deployment).
2. Compare **before** vs **after** over ≥24–72h:
   - Vercel Fast Data Transfer → Routes → `/api/sync` (was **4.66 GB in / 72h**, ~**1.11 MB/req**).
   - Neon branch `br-divine-butterfly-atpy853x` (`lively-field-29847013`) `data_transfer_bytes`.
3. Confirm `/api/sync` is no longer dominating inbound. If it still is, debug B before touching D–H.

**Baseline (pre-B, for PR before/after tables):**

| Signal | Value |
|--------|-------|
| Vercel 72h project in / out | ~5 GB / ~725 MB |
| `/api/sync` | 4.2K req, **4.66 GB in**, 166 MB out |
| `/api/notifications` | 5.7K req, **~17 MB** total (~3 KB/req) |
| Neon prod rolls | 3930; avg `badges_json` ~**2684 B** |
| Neon wrong twin | `bitter-grass-47308091` — ignore |

---

## Recommended ship order (second pass)

Suggested priority by residual impact after B (re-rank with fresh metrics):

| Order | ID | Workstream | Est. residual impact | Own PR? |
|-------|-----|------------|----------------------|---------|
| 1 | **E** (+ **C**) | Slim `BadgeHit` on roll APIs + lightweight publish probe | Highest remaining wire on ranked/arcade/rolls | Yes (C can fold into E) |
| 2 | **F** | Leaderboard `view=best` SQL top-N | Neon egress on best-view | Yes |
| 3 | **D** | Notifications poll / payload trim | ~17 MB/72h today; grows with users | Yes |
| 4 | **G** | Follow list limit + slim fields | Tail risk; low volume today | Yes |
| 5 | **H** | QueryClient default `staleTime` | Extra focus refetches | Yes (tiny) |

Each PR: `pnpm typecheck` + relevant tests, CHANGELOG, before/after estimate in PR body.

**Out of scope for all of D–H:** game RNG, badge scoring formulas, Ranked CSPRNG, sync integrity / streak-never-maxed rules, Arcade Digits↔EP conversion.

---

## File map (second pass)

| Workstream | Primary files |
|------------|---------------|
| D | `src/ui/layout/AppShell.tsx`, `src/ui/screens/NotificationsScreen.tsx`, `server/notifications.ts`, `api/notifications.ts`, `src/lib/notifications-api.ts` |
| E | `server/rankedRoll.ts`, `server/arcade.ts`, `api/rolls/[id].ts`, `src/lib/roll-api.ts`, `src/lib/arcade-api.ts`, `src/game/types.ts` (slim DTO), hydrate helper near `BADGE_CATALOG` |
| C | `api/rolls/[id].ts` or new HEAD handler, `src/lib/roll-api.ts` `isRollPublished`, `src/state/useSync.ts` `waitForCloudPublish` |
| F | `server/leaderboard.ts` (~best-view path with `.limit(5000)`), optional index script under `scripts/` |
| G | `api/follow.ts`, `src/lib/leaderboard-api.ts` (or follow-api), `LeaderboardScreen.tsx` / `FriendsScreen.tsx` / `ProfileScreen.tsx` |
| H | `src/main.tsx` `QueryClient`, spot-check screens that already set `staleTime` |

---

## Workstream E — Slim badge payloads (+ C)

### Problem

Ranked POST, arcade roll POST, and `GET /api/rolls/:id` ship full `BadgeHit[]` (name, description, highlights[7], equation, …). DB avg `badges_json` ≈ **2.7 KB/roll**. Client already has `BADGE_CATALOG`.

`isRollPublished` only needs existence but downloads the full roll JSON (up to 8× during share publish).

### Target shapes

**Wire (server → client):**

```ts
type BadgeHitWire = {
  id: string;
  highlights?: boolean[];
  equation?: BadgeEquation; // only if non-catalog / dynamic
  // omit name, description, emoji, family, ep, rarity, image when catalog-known
};
```

**Client hydrate:** `hydrateBadgeHits(wire[]): BadgeHit[]` via `BADGE_CATALOG` lookup; unknown ids stay minimal or drop.

**C — existence probe:**

- Prefer `HEAD /api/rolls/:key` → 204/404, or `GET ?exists=1` → `{ exists: true }` (~50 B).
- `isRollPublished` uses that; `PublicRollScreen` still uses full GET (hydrated).

### Task E1: Define wire type + hydrate helper

**Files:**
- Create: `src/game/badgeHydrate.ts` (or `src/lib/badge-hydrate.ts`)
- Modify: `src/game/types.ts` only if exporting a wire type
- Test: `src/game/badgeHydrate.test.ts`

- [ ] **Step 1:** Write failing tests — catalog id hydrates name/ep; unknown id does not throw; highlights from wire override.
- [ ] **Step 2:** Implement `hydrateBadgeHits`.
- [ ] **Step 3:** `pnpm test` green; commit.

### Task E2: Server returns slim badges on ranked / arcade / public roll

**Files:**
- Modify: `server/rankedRoll.ts`, `server/arcade.ts`, `api/rolls/[id].ts` (and any shared serializer)
- Modify: client consumers in `GameProvider` / arcade screen to hydrate before UI

- [ ] **Step 1:** Add `toBadgeHitWire(hit: BadgeHit): BadgeHitWire` on server (or strip in JSON map).
- [ ] **Step 2:** Ranked + arcade + rolls GET emit wire form.
- [ ] **Step 3:** Client hydrate at API wrapper boundary (`roll-api.ts`, `arcade-api.ts`) so UI still sees full `BadgeHit`.
- [ ] **Step 4:** Typecheck + manual Ranked roll + Arcade roll + public roll page.
- [ ] **Step 5:** CHANGELOG + PR with before/after size estimate (e.g. ~8–25 KB → ~1–3 KB typical ranked response).

### Task C: Lightweight publish probe (fold into E PR or tiny follow-up)

**Files:**
- Modify: `api/rolls/[id].ts`, `src/lib/roll-api.ts`

- [ ] **Step 1:** Support `HEAD` or `?exists=1` without loading/parsing full `badges_json` if possible (`SELECT 1` / `id` only).
- [ ] **Step 2:** Point `isRollPublished` at the light path.
- [ ] **Step 3:** Confirm `waitForCloudPublish` still settles; Discord/share unaffected.

**Preserve:** Attestation, shortCode, Ranked `source`, Arcade Digits semantics.

---

## Workstream F — Leaderboard best-view SQL top-N

### Problem

[`server/leaderboard.ts`](../../server/leaderboard.ts) best-view path fetches up to **5000** roll rows, ranks in app, returns 50. Wire stays ~8–15 KB; **Neon egress** is the cost.

### Approach

- Push sort + limit into SQL (`ORDER BY total_ep DESC` or rarity rank expression `LIMIT limit` / `LIMIT limit*N` only if “me”/friends need a wider pool).
- Prefer indexed access; add additive `CREATE INDEX IF NOT EXISTS` script if explain shows seq scans.
- Keep client `limit=50` and response shape unchanged.

### Task F1: Replace 5000-row pool

**Files:**
- Modify: `server/leaderboard.ts` (best-view function ~`.limit(5000)`)
- Optional: `scripts/add-rolls-best-leaderboard-idx.mjs`
- Test: `server/leaderboardFriends.test.ts` or new best-view unit if extractable

- [ ] **Step 1:** Document current query + explain on prod branch (read-only).
- [ ] **Step 2:** Rewrite to SQL top-N; keep `me` / `friendsOnly` behavior.
- [ ] **Step 3:** Additive index script if needed; apply on Neon `lively-field-29847013`.
- [ ] **Step 4:** Manual smoke Ranked/Practice Best Roll + Friends filter.
- [ ] **Step 5:** CHANGELOG + PR (before/after: rows read from Neon per request).

**Preserve:** Dual board Ranked vs Practice; `view=total` path can stay as-is unless cheap to align.

---

## Workstream D — Notifications poll / payload trim

### Problem

[`AppShell.tsx`](../../src/ui/layout/AppShell.tsx) and [`NotificationsScreen.tsx`](../../src/ui/screens/NotificationsScreen.tsx) share `['notifications']` with **`refetchInterval: 45_000`** while signed in (~80 req/hr/user). Caps: activity 100 + system 50; system `body` up to 8 KB. Dashboard: high QPS, low bytes today (~17 MB/72h) — still worth trimming as MAU grows.

### Approach (pick in PR; default below)

**Default locked for this plan:**

1. **Unread peek** while not on Notifications tab: small `{ unread: { activity, system, total } }` (or existing counts only) every **120s**.
2. **Full inbox** fetch only when Notifications route is active (interval **60s** or on focus).
3. Server: when listing, prefer omitting huge bodies for read items older than N days **or** truncate list bodies in list endpoint and lazy-load body on expand (only if UI already supports it — otherwise skip prune in v1).

### Task D1: Split peek vs full query

**Files:**
- Modify: `server/notifications.ts`, `api/notifications.ts`, `src/lib/notifications-api.ts`
- Modify: `AppShell.tsx`, `NotificationsScreen.tsx`

- [ ] **Step 1:** Add `GET /api/notifications?peek=1` (or `/unread`) returning counts only.
- [ ] **Step 2:** AppShell uses peek @ 120s; NotificationsScreen uses full list @ 60s when mounted.
- [ ] **Step 3:** Keep shared cache keys coherent (peek must not clobber full list data — use distinct query keys).
- [ ] **Step 4:** Manual: badge unread updates off-tab; opening inbox still shows rows; System mark-all-read still works ([`inboxPresentation.ts`](../../src/lib/inboxPresentation.ts) grouping unchanged).
- [ ] **Step 5:** CHANGELOG + PR.

**Preserve:** Activity vs System tabs; crown grouping display-layer behavior; admin broadcast writers.

---

## Workstream G — Follow list limit + slim fields

### Problem

[`api/follow.ts`](../../api/follow.ts) GET returns **all** follows with vanity + `lifetimeEP`. `fetchFollowingUsernames` only needs a `Set<string>` but pulls the fat payload. Unbounded tail risk.

### Approach

- `GET /api/follow?fields=usernames` → `{ following: string[] }` (or `{ usernames: string[] }`).
- `GET /api/follow?limit=100` (or paginate) for Friends UI full rows.
- Point `fetchFollowingUsernames` at slim variant; `fetchFollowingList` keeps rich rows with a sane default limit.

### Task G1: Slim + limit

**Files:**
- Modify: `api/follow.ts`, follow/leaderboard API wrappers, `LeaderboardScreen.tsx`, `FriendsScreen.tsx`, `ProfileScreen.tsx`

- [ ] **Step 1:** Add `fields` + `limit` query parsing; default limit for rich list (e.g. 200).
- [ ] **Step 2:** Switch username-set consumers to slim endpoint.
- [ ] **Step 3:** Friends screen still shows avatar/flair/EP.
- [ ] **Step 4:** CHANGELOG + PR.

---

## Workstream H — QueryClient default `staleTime`

### Problem

[`src/main.tsx`](../../src/main.tsx) uses `new QueryClient()` → library defaults `staleTime: 0`, `refetchOnWindowFocus: true`. Leaderboard / feed / arcade-leaderboard refetch on every tab focus. Some queries already override (`following` 60s, ranked quota 30s + `refetchOnWindowFocus: false`).

### Approach

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // or 60_000
      // leave refetchOnWindowFocus: true (staleTime makes it cheap)
    },
  },
});
```

Do **not** raise staleTime for notifications peek if D expects fresher unread — set explicit `staleTime: 0` on those queries.

### Task H1: Defaults + audit overrides

**Files:**
- Modify: `src/main.tsx`
- Audit: `LeaderboardScreen.tsx`, `CommunityHighlights.tsx`, `FeatureRequestsScreen.tsx`, notifications queries

- [ ] **Step 1:** Set default `staleTime: 30_000`.
- [ ] **Step 2:** Explicitly set `staleTime: 0` (or short) on notifications / any live badge that must stay hot.
- [ ] **Step 3:** Confirm mutations still `invalidateQueries` where needed (follow, feature upvote, arcade).
- [ ] **Step 4:** CHANGELOG (one line) + PR.

---

## Verification matrix (after each PR)

| Check | How |
|-------|-----|
| Typecheck | `pnpm typecheck` |
| Unit tests | `pnpm test` (touched areas) |
| Transfer | Vercel Routes table + Neon `data_transfer_bytes` 24h later |
| Product smoke | Free + Ranked roll settle; mode switch reel; share publish; Friends board; Notifications badge |

Manual roll-mode checklist (if roll UI touched — mainly E): Free / Daily / Free-after-Daily / Ranked — see AGENTS.md §9.

---

## Success criteria for the second pass overall

1. `/api/sync` remains the measured winner of first pass (not regressed).
2. Ranked/arcade/roll JSON no longer embeds full catalog text per badge (E).
3. Best-view leaderboard no longer reads thousands of roll rows per request (F).
4. Signed-in users are not full-inbox polling every 45s while browsing other tabs (D).
5. Follow username lookups are slim; rich list is capped (G).
6. Board/feed focus refetches are bounded by default staleTime (H).

---

## References

- Parent execution plan (Cursor): payload transfer audit / approved 0→B order
- Live: https://rngdle-unlocked.chron0.tech
- Neon prod: org `Vercel: Jon Marien's projects`, project `lively-field-29847013`, branch `br-divine-butterfly-atpy853x`
- AGENTS.md §§5.1–5.4, 7–8 (trust model, API wrappers, TanStack)
