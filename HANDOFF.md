# HANDOFF — RNGdle Unlocked

**For the next agent.** Read this + [`AGENTS.md`](./AGENTS.md) + [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) before large changes.

|                            |                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| **Repo**                   | `jondmarien/rngdle-unlocked`                                                                  |
| **Live**                   | https://rngdle-unlocked.chron0.tech                                                           |
| **Branch**                 | `main` (auto-deploys Vercel)                                                                  |
| **Version**                | `0.7.1` (`package.json`; Settings uses `VITE_APP_VERSION`)                                    |
| **Latest release**         | [v0.7.1](https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.7.1) (cut when tagged) |
| **Handoff commit context** | Opus audit refactor (`aa8e91e`…`fc4fa65` on `main`) + prior P0/P1 wave                        |

---

## 1b. Architecture refactor — actual end-state (July 2026)

The [opus audit](docs/opus-report.md) (§§A–G historical; **§H** current) drove a readability/expandability refactor that landed on `main` in 11 commits (`aa8e91e`…`fc4fa65`). **Why:** stop recurring Ranked ESM outages at compile time, collapse handler/auth boilerplate, make the client API boundary mandatory, and shrink `GameProvider`. **Do not describe the original audit plan as if every item landed unchanged.** See also [`docs/refactor-notes-2026-07.md`](docs/refactor-notes-2026-07.md).

### Changelog-style summary (this pass)

| Area    | What changed                                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tooling | Root `tsconfig.json` = api/server **NodeNext** (Vercel-safe); app/node stay separate                                   |
| Server  | `apiGuards` (`requireUser` / `readJson` / `rateGuard`); read pipelines in `server/{leaderboard,profile,feed,ogSvg}.ts` |
| Client  | Mandatory `lib/*-api.ts` wrappers; TanStack Query on key reads; Zod at import/sync/profile; `useSync` + three contexts |
| Quality | Session typing; format/StatTile/SegmentedToggle/rarity dedupe; `storage-keys.ts`; dead-code sweep                      |

**New direct deps:** `@tanstack/react-query`, `zod` (see `package.json`).

### Landed as intended

- **`tsconfig.json`** — API/server graph uses `NodeNext` + `nodenext` + `types: ["node"]` at the **root** (Vercel typechecks `/api` here and ignores project references). `tsconfig.server.json` extends it; app/Vite stay on `tsconfig.app.json` / `tsconfig.node.json`.
- **`server/apiGuards.ts`** — `requireUser`, `readJson`, `rateGuard` adopted across handlers.
- **TanStack Query + `src/lib/*-api.ts` client API wrappers** — UI must not raw-`fetch` `/api/*`; `GameProvider` split into `useSync`, settings reducer, and three contexts (`useGame` / `useGameSettings` / `useCloudSync`).
- **Zod at trust boundaries** — `parseImportPayload`, `api/sync` body, `fetchProfile` response.
- **Read-side pipelines** — `server/{leaderboard,profile,feed,ogSvg}.ts` + expanded `server/notifications.ts`.
- **Dedupes** — `format.ts`, `StatTile`, `SegmentedToggle`, rarity consolidation, `storage-keys.ts`, dead-code sweep.
- **Automated verification** — `pnpm typecheck`, `pnpm test`, `pnpm build` pass after the refactor.

### Intentional deltas from the audit plan

| Area                               | Actual behavior                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **`PATCH /api/me` malformed JSON** | Returns **HTTP 400** (`Invalid JSON`) via `readJson`, not a generic 500.                                                                        |
| **Save import validation**         | Corrupt/hand-edited saves throw `Invalid save file: …` (e.g. corrupt roll history / badge collection). Valid legacy exports still import.       |
| **`SegmentedToggle` migration**    | **Not** applied to `RollModePicker` rich radio cards or `CollectionScreen` family-filter chips — those UIs stay bespoke.                        |
| **`POST /api/system-messages`**    | **Still live** (admin-session POST). Not removed; `api/admin/broadcast.ts` is the day-to-day path but the redundant surface was left untouched. |
| **Not landed**                     | `useSaveTransfer`, `badgeJson`/`routeParams`, `game/history.ts`, path aliases, full TanStack/`useMutation`, Zod on all POSTs                    |

### Still required — not verified in-repo

- **Manual browser smoke** for AGENTS.md §9 four-point roll-mode check (Free → Daily → mode-switch Free → Ranked). `pnpm typecheck` / `pnpm test` / `pnpm build` do **not** substitute; do not claim this checklist passed unless there is explicit evidence (release notes, smoke log, or user confirmation).

---

## 1. What this product is

Unlimited random-number game (0–1,000,000): badges, EP, rarity, history, codex. **Local-first** (`localStorage`). Cloud optional (Better Auth, Neon, social, Ranked competition).

**Not affiliated with rngdle.com.** Do not port hate-symbol easter eggs (user previously refused 1488 / “White Power” / “Grand Wizard” badge work).

---

## 2. Session arc (what we built / fixed)

Rough chronological product work across this multi-turn session (and immediate predecessor context):

### Social / product polish (earlier in thread → carried in)

- Sticky header + nav (`AppShell`)
- History multi-sort (best/worst EP, rarity, badges, number, newest/oldest)
- Personal best card on Home / History / Showcase + replay
- Profile: collapsible sections, top-10 lists, public codex toggle (`profile_show_codex`)
- Auto-share high rarity **default off**
- Share race fix (pin settled roll for anomaly/mythic auto-share)
- Cascade badge UX + auto-scroll setting
- Community today/week bests on home when idle
- OG / profiles / fonts / icons / avatars (prior wave)

### Competitive fairness (major)

- **Free play** = browser CSPRNG → **Leaderboard → Practice** only
- **Ranked** = `POST /api/ranked-roll` server CSPRNG → **Leaderboard → Ranked** + community crowns + overtake alerts
- `rolls.source`: `client` | `ranked` | `challenge` (default `client`)
- Client sync **cannot forge ranked** (upsert preserves `ranked` on conflict)
- Dual boards UI on Leaderboard (`?scope=ranked|practice`)
- Overtake Activity notifs when someone takes your day/week/all-time Ranked crown
- System crown broadcasts for Ranked #1 (day/week/all-time)

### Jackpot / scoring

- Absolute Ceiling jackpot 1-in-100M + badge **Absolute Ceiling** (`/badges/ceiling.jpg`, 100k EP)
- Percentile “Top %” recalibrated (anomaly ~5%, mythic ~1%); UI uses `topPercentFromEP(totalEP)` not stale stored percentile

### Feed / history / home chrome

- Feed: **self + following**, all rarities (not rare-only), toggles All / Ranked / Free play
- History: lane chips Free / Ranked / Challenge + sort chips
- **Latest runs** panel: top 10 per mode; **fixed right under sticky header** (not mid-column squeeze)
- Mobile: Latest runs below reel

### FX

- Tiered celebrate: rare → epic → anomaly → mythic (confetti density/palette, edge blooms, screen shake, mythic rays/flash, richer audio)
- Settings: confetti toggle covers full celebrate stack
- Confetti origin centered (`Celebration.tsx`) — see §7 Done

### Reliability fixes worth knowing

| Bug                                   | Root cause                                                 | Fix                                                 |
| ------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Ranked `FUNCTION_INVOCATION_FAILED`   | ESM extensionless imports under `/var/task`                | `.js` extensions throughout `src/game` import graph |
| Ranked module not found `rarity`      | `badges/index` → `../rarity`                               | same                                                |
| Reel stuck `?????` after Daily/Weekly | `NumberDisplay` `lastRevealKey` collision after mode reset | remount reel + reset lastRevealKey + in-flight ref  |
| Free play sync 429                    | hourly `rollsUploadPerHour: 120`                           | **removed**; only soft per-minute sync burst        |
| System notifs require per-click       | design                                                     | viewing System tab marks all system read            |
| Mermaid “Unable to render” on GitHub  | `<br/>`, unicode dots, path-like labels                    | simplified diagrams in README / ARCHITECTURE        |

### Resolved (architecture refactor)

| Issue                                                                                     | Resolution                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Recurring Ranked outage from extensionless ESM imports typechecking green under `bundler` | **`tsconfig.server.json` NodeNext** — `pnpm typecheck` fails on missing `.js` extensions in the api/server graph (still keep `.js` discipline in `src/game`) |
| Fat read handlers / duplicated auth-parse-rate boilerplate                                | `server/apiGuards.ts` + `server/{leaderboard,profile,feed,ogSvg}.ts`                                                                                         |
| Screens bypassing `lib/*-api.ts` with raw `fetch`                                         | Client API wrappers mandatory; TanStack Query on leaderboard/feed/highlights/profile/admin-check                                                             |
| Blind casts at import/sync/profile                                                        | Zod at those trust boundaries                                                                                                                                |
| Monolithic GameProvider sync + settings                                                   | `useSync.ts` + settings reducer + three contexts                                                                                                             |
| Confetti origin left/top-left                                                             | Center burst in `Celebration.tsx` (was listed as open; fixed this wave)                                                                                      |

### Docs / agent files

- `AGENTS.md` — standing rules for agents (comprehensive)
- `README.md` + `docs/ARCHITECTURE.md` updated for dual boards / Ranked
- Release **v0.4.0** published

---

## 3. Mental model (non-negotiable)

```
Free play (client RNG)  →  local history  →  sync as source=client  →  Practice board
Ranked (server RNG)     →  Neon source=ranked  →  Ranked board + crowns + overtake
Daily/Weekly            →  seed challenge    →  source=challenge
```

| Surface                                  | Ranked only?                         |
| ---------------------------------------- | ------------------------------------ |
| Leaderboard → Ranked                     | Yes                                  |
| Leaderboard → Practice                   | No (progress / non-ranked week)      |
| Home community bests (`/api/highlights`) | Yes Ranked                           |
| System crown messages + overtake         | Yes Ranked                           |
| Feed                                     | Filterable all / ranked / practice   |
| History / Latest runs                    | Filterable free / ranked / challenge |

---

## 4. Key files

| Area                   | Path                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Roll orchestration     | `src/state/GameProvider.tsx`                                                                                                                  |
| Cloud sync             | `src/state/useSync.ts`, `useCloudSync`                                                                                                        |
| Settings               | `src/state/settings.ts`, `useGameSettings`                                                                                                    |
| Client API wrappers    | `src/lib/*-api.ts` (`roll-api`, `leaderboard-api`, `profile-api`, …)                                                                          |
| Zod schemas            | `src/lib/schemas.ts`                                                                                                                          |
| QueryClient            | `src/main.tsx`                                                                                                                                |
| Handler guards         | `server/apiGuards.ts`                                                                                                                         |
| Read pipelines         | `server/leaderboard.ts`, `profile.ts`, `feed.ts`, `ogSvg.ts`, `featureRequests.ts`                                                            |
| Home reel + mode reset | `src/ui/screens/HomeScreen.tsx`, `NumberDisplay.tsx`                                                                                          |
| Latest runs            | `src/ui/components/LatestRunsPanel.tsx`                                                                                                       |
| Mode copy              | `src/ui/components/RollModePicker.tsx`                                                                                                        |
| Celebrate FX           | `src/ui/components/Celebration.tsx`, `src/styles/global.css`, `src/game/fx.ts`                                                                |
| Ranked issue           | `server/rankedRoll.ts`, `api/ranked-roll.ts`                                                                                                  |
| Crowns / overtake      | `server/rollActivity.ts`                                                                                                                      |
| Sync                   | `server/sync.ts`, `api/sync.ts`                                                                                                               |
| Leaderboard            | `server/leaderboard.ts`, `api/leaderboard.ts`, `LeaderboardScreen.tsx` (Ranked/Practice/Arcade)                                               |
| Feature requests       | `server/featureRequests.ts`, `api/feature-requests*`, `FeatureRequestsScreen.tsx`                                                             |
| Arcade Mode            | `src/game/arcade/`, `server/arcade.ts`, `arcadeLeaderboard.ts`, `api/arcade/*`, `ArcadeScreen.tsx`                                            |
| Feed                   | `server/feed.ts`, `api/feed.ts`                                                                                                               |
| Schema                 | `server/db/schema.ts` (`rolls.source`, arcade\_\*)                                                                                            |
| Badge catalog          | `src/game/badges/catalog.ts`                                                                                                                  |
| Absolute Ceiling art   | `public/badges/ceiling.jpg`                                                                                                                   |
| Migrations             | `scripts/add-roll-source.mjs`, `scripts/migrate-feature-wave.mjs`, `scripts/migrate-features-and-best-roll.mjs`, `scripts/migrate-arcade.mjs` |
| Refactor notes         | `docs/refactor-notes-2026-07.md`, `docs/opus-report.md` §H                                                                                    |

---

## 5. Commands & env

```bash
pnpm install
pnpm dev            # SPA only
pnpm test
pnpm typecheck      # includes tsconfig.server.json (NodeNext)
pnpm build          # app + node typecheck, then Vite (server graph via typecheck)
npx vercel dev      # SPA + APIs locally
node scripts/add-roll-source.mjs   # if source column missing
```

**Deps of note:** `@tanstack/react-query`, `zod` (direct). Env: `.env.example` — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_APP_URL`, optional `ADMIN_SECRET`, OAuth + Resend vars.

**Schema caution:** `pnpm db:push` may prompt to truncate `rolls` for unique constraints. Prefer additive scripts unless user accepts data loss.

---

## 6. Pitfalls for the next agent

1. **ESM on Vercel:** any new `src/game` file loaded by serverless must use **relative `.js` extensions** in imports. NodeNext on `tsconfig.server.json` catches this at `pnpm typecheck` — do not revert to `bundler` for the server project.
2. **Mode switch reel:** never reset `revealKey` without remounting `NumberDisplay` or clearing `lastRevealKey` (stuck `?????`).
3. **Do not reintroduce** free-play hourly upload cap.
4. **Do not let client sync set `source=ranked`.**
5. **Browser extension noise** (`Receiving end does not exist`, `content.js`) is not app code.
6. **GitHub Mermaid:** no HTML `<br/>`, avoid unicode middle-dots and heavy path punctuation in node labels.
7. **Hate easter eggs:** refuse.
8. Local scratch only (gitignored): `scripts/*.tmp`, `next notes.txt`.  
   **Keep and commit** diagnostic scripts: `scripts/check-sync-db.mjs`, `debug-sync.mjs`, `debug-ranked-roll.mjs`.

---

## 7. Open / next work (user-facing backlog)

### Done this wave

- [x] Confetti center burst (`Celebration.tsx`)
- [x] Latest runs live enter/exit animation (no remount key wipe)
- [x] P1: rail offset, Ranked ~90/h copy, Settings version inject, challenge copy
- [x] Role-gated `/admin` + reports + audit; `ADMIN_SECRET` bootstrap only
- [x] Discord + GitHub OAuth wiring + [`docs/oauth-setup.md`](./docs/oauth-setup.md)
- [x] Commit diagnostic scripts; bump `0.4.1`
- [x] Cut annotated **`v0.5.0`** (architecture refactor docs + version)
- [x] **v0.6.0** — Best Roll leaderboard + Features request tab
- [x] **v0.7.0** — Arcade Mode (Digits runs) + mode-first Leaderboard (Ranked | Practice | Arcade | Feed | Find)
- [x] **v0.7.1** — Notifications hierarchy + crown grouping; Features status sections (`--feature-*` tokens)

### Still open for you / ops

- [ ] Create Discord Application + GitHub OAuth App using `docs/oauth-setup.md` + `public/brand/oauth-icon-512.png`; paste Client ID/Secret into Vercel
- [ ] Promote your account: `CONFIRM_PROMOTE=yes node scripts/promote-admin.mjs --email you@…` (needs `ADMIN_SECRET` + `DATABASE_URL`)
- [ ] Smoke prod: Free/Ranked/mode-switch; epic+ confetti center; Latest runs animation; `/admin`; OAuth buttons after env

### P2 competitive / social

- [ ] Feed: optional “rare+ only” filter as _optional_ chip (currently all rarities by design).
- [ ] Profile / public roll pages: surface Free vs Ranked more clearly.
- [ ] Leaderboard empty state when few Ranked rolls — onboarding CTA to Ranked mode.

### P3 platform / later

- [ ] Turnstile on sign-up
- [ ] Server-side EP velocity caps
- [ ] Dependabot moderate vulnerability on default branch (GitHub warning)

---

## 8. How to smoke-test after deploy

1. **Free play** Generate → digits settle → History Free lane updates → Latest runs Free tab.
2. Switch **Daily** Generate → settles → switch **Free** again → still settles (no stuck `?????`).
3. **Ranked** (signed in + `@username`) → Generate → History Ranked + Leaderboard Ranked + system crown if #1.
4. **Arcade** (`/arcade`) → Start run → Roll → buy upgrade → Cash out; Board → Arcade shows Digits score. Abandon uses two-step confirm.
5. **Feed** tabs All / Ranked / Free play; own rolls appear without self-follow. Leaderboard primary tabs: Ranked | Practice | Arcade | Feed | Find.
6. **System messages** tab → unread clears without clicking each.
7. **Epic+** settle with confetti enabled → tiered FX; reduced-motion → soft edges only.

---

## 9. Product copy principles

Keep language consistent everywhere (About, RollModePicker, Leaderboard, README, Arcade):

- Free play = practice / Practice board / not crowns
- Ranked = server RNG / Ranked board / crowns + overtake
- Practice leaderboard = social honor system
- Ranked leaderboard = fair competition baseline
- Arcade = Digits runs / Arcade board / Digits ≠ EP / not a Home RollMode

---

## 10. Suggested first task for the next agent

1. Confirm user finished OAuth portal setup + `promote-admin.mjs`.
2. Hard-refresh prod smoke checklist §8 + `/admin` + Discord/GitHub Account buttons.
3. Keep About → What’s new (`src/lib/whats-new.ts`) player-facing when cutting releases; keep `CHANGELOG.md` developer-oriented.

---

## 11. Commit map (session-relevant)

```
fc4fa65 fix(ts): restore ImportMeta.env and CSS module types for the IDE
c32ee4a … aa8e91e  architecture refactor steps 1–10 (NodeNext → dead-code sweep)
…
ae21ace fix(home): float Latest runs right under chrome, not mid-column
9a168c5 feat(fx): tiered epic/anomaly/mythic celebrate FX
7c49588 feat(home): Latest runs sidebar with Free/Ranked/Challenge tabs
054548a docs: add comprehensive AGENTS.md for coding agents
6ac063f fix(roll): unstick reel after Daily/Weekly mode switch
922b6b5 feat(feed,history): Free play vs Ranked lanes
…
670305f feat: Ranked free play (server RNG) + board fairness
```

---

_User instruction priority: explicit user request > AGENTS.md > this handoff > README > older design docs under `docs/superpowers/` (some predate Ranked)._
