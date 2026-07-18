# Refactor notes - July 2026

Internal architecture pass for **readability and expandability**. No intentional behavior, API contract, or game-rule changes.

**Commits:** `aa8e91e`...`fc4fa65` (11 commits).  
**Canonical handoff:** [`HANDOFF.md`](../HANDOFF.md) §1b.  
**Audit trail:** [`opus-report.md`](https://github.com/jondmarien/rngdle-unlocked/blob/main/docs/opus-report.md) §§A-G (historical findings) / §H (landed status).

---

## 1. NodeNext for the serverless graph

**Decision:** Split TypeScript into a solution root + `tsconfig.server.json` with `module: NodeNext` and `moduleResolution: nodenext` for `api/**` and `server/**`.

**Why:** Under `bundler` resolution, extensionless relative imports typechecked green but failed at runtime on Vercel Node ESM (`Cannot find module '/var/task/src/game/rarity'`). NodeNext makes `pnpm typecheck` fail on that class of bug before deploy.

**Keep:** Explicit `.js` extensions on relative imports in the `src/game` graph loaded by serverless.

---

## 2. `server/apiGuards.ts`

**Decision:** Centralize `requireUser`, `readJson`, and `rateGuard` as the required preamble for new handlers.

**Why:** Collapse duplicated auth / JSON-parse / rate-limit blocks and revive `getSessionUser` from `server/session.ts`.

**Exceptions by design:** `api/health.ts`, `api/auth.ts`, bot HTML `api/share/*` and `api/u/*` do not use the same guard surface.

---

## 3. Mandatory `lib/*-api.ts` client API wrappers

**Decision:** Screens and components call typed wrappers under `src/lib/*-api.ts` - never raw `fetch('/api/...')` in `src/ui/**`.

**TanStack Query:** `QueryClientProvider` in `src/main.tsx`. Cached reads today: leaderboard, feed, highlights, profile, admin-check (`useIsAdmin`). Notifications/account may still use effects + wrappers.

**Terminology:** prefer **client API wrappers** + **TanStack Query** (not "network layer" / "API client" interchangeably).

---

## 4. Zod at trust boundaries

**Decision:** Validate save **import** payloads, cloud **sync** POST bodies, and public **profile** GET responses.

**Where:** `src/lib/schemas.ts`, `src/state/storage.ts`, `server/sync.ts` / `api/sync.ts`, `src/lib/profile-api.ts`.

**Not claimed:** blanket runtime validation on every POST or query string.

---

## 5. Read-side pipelines in `server/`

**Decision:** Move leaderboard, profile, feed, OG SVG, and notifications assembly out of fat `api/*` handlers into `server/{leaderboard,profile,feed,ogSvg,notifications}.ts`.

**Still fatter inline:** `follow`, `me`, `attest`, and parts of sync orchestration - extract when next touched.

---

## 6. GameProvider split

**Decision:** Extract `src/state/useSync.ts` and a settings reducer; expose three contexts - `useGame`, `useGameSettings`, `useCloudSync`.

**Not landed from audit:** `useSaveTransfer` (import/export remain in `GameProvider`).

---

## Intentional deltas (not bugs)

- `PATCH /api/me` malformed JSON -> HTTP **400** via `readJson`.
- Corrupt save imports -> `Invalid save file: ...`; valid legacy exports still work.
- `SegmentedToggle` not applied to `RollModePicker` or Collection family chips.
- `POST /api/system-messages` still live alongside `api/admin/broadcast.ts`.
- Manual AGENTS.md §9 roll-mode browser smoke still required before claiming reel UX verified.
