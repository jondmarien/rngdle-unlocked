# HANDOFF — RNGdle Unlocked

**For the next agent.** Read this + [`AGENTS.md`](./AGENTS.md) + [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) before large changes.

| | |
| --- | --- |
| **Repo** | `jondmarien/rngdle-unlocked` |
| **Live** | https://rngdle-unlocked.chron0.tech |
| **Branch** | `main` (auto-deploys Vercel) |
| **Version** | `0.4.1` (`package.json`; Settings uses `VITE_APP_VERSION`) |
| **Latest release** | [v0.4.0](https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.4.0) (cut `v0.4.1` after smoke) |
| **Handoff commit context** | P0/P1 + admin + OAuth wave |

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
- **Open issue:** confetti origin still feels left/top-left — user wants **center of screen** (see §7)

### Reliability fixes worth knowing
| Bug | Root cause | Fix |
| --- | --- | --- |
| Ranked `FUNCTION_INVOCATION_FAILED` | ESM extensionless imports under `/var/task` | `.js` extensions throughout `src/game` import graph |
| Ranked module not found `rarity` | `badges/index` → `../rarity` | same |
| Reel stuck `?????` after Daily/Weekly | `NumberDisplay` `lastRevealKey` collision after mode reset | remount reel + reset lastRevealKey + in-flight ref |
| Free play sync 429 | hourly `rollsUploadPerHour: 120` | **removed**; only soft per-minute sync burst |
| System notifs require per-click | design | viewing System tab marks all system read |
| Mermaid “Unable to render” on GitHub | `<br/>`, unicode dots, path-like labels | simplified diagrams in README / ARCHITECTURE |

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

| Surface | Ranked only? |
| --- | --- |
| Leaderboard → Ranked | Yes |
| Leaderboard → Practice | No (progress / non-ranked week) |
| Home community bests (`/api/highlights`) | Yes Ranked |
| System crown messages + overtake | Yes Ranked |
| Feed | Filterable all / ranked / practice |
| History / Latest runs | Filterable free / ranked / challenge |

---

## 4. Key files

| Area | Path |
| --- | --- |
| Roll orchestration | `src/state/GameProvider.tsx` |
| Home reel + mode reset | `src/ui/screens/HomeScreen.tsx`, `NumberDisplay.tsx` |
| Latest runs | `src/ui/components/LatestRunsPanel.tsx` |
| Mode copy | `src/ui/components/RollModePicker.tsx` |
| Celebrate FX | `src/ui/components/Celebration.tsx`, `src/styles/global.css`, `src/game/fx.ts` |
| Ranked issue | `server/rankedRoll.ts`, `api/ranked-roll.ts` |
| Crowns / overtake | `server/rollActivity.ts` |
| Sync | `server/sync.ts`, `api/sync.ts` |
| Leaderboard | `api/leaderboard.ts`, `LeaderboardScreen.tsx` |
| Feed | `api/feed.ts` |
| Schema | `server/db/schema.ts` (`rolls.source`) |
| Badge catalog | `src/game/badges/catalog.ts` |
| Absolute Ceiling art | `public/badges/ceiling.jpg` |
| Migrations | `scripts/add-roll-source.mjs`, `scripts/migrate-feature-wave.mjs` |

---

## 5. Commands & env

```bash
pnpm install
pnpm dev            # SPA only
pnpm test
pnpm typecheck
pnpm build
npx vercel dev      # SPA + APIs locally
node scripts/add-roll-source.mjs   # if source column missing
```

Env: `.env.example` — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_APP_URL`, optional `ADMIN_SECRET`.

**Schema caution:** `pnpm db:push` may prompt to truncate `rolls` for unique constraints. Prefer additive scripts unless user accepts data loss.

---

## 6. Pitfalls for the next agent

1. **ESM on Vercel:** any new `src/game` file loaded by serverless must use **relative `.js` extensions** in imports.
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

### Still open for you / ops
- [ ] Create Discord Application + GitHub OAuth App using `docs/oauth-setup.md` + `public/brand/oauth-icon-512.png`; paste Client ID/Secret into Vercel
- [ ] Promote your account: `CONFIRM_PROMOTE=yes node scripts/promote-admin.mjs --email you@…` (needs `ADMIN_SECRET` + `DATABASE_URL`)
- [ ] Smoke prod: Free/Ranked/mode-switch; epic+ confetti center; Latest runs animation; `/admin`; OAuth buttons after env
- [ ] Cut annotated `v0.4.1` release when ready

### P2 competitive / social
- [ ] Feed: optional “rare+ only” filter as *optional* chip (currently all rarities by design).
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
4. **Feed** tabs All / Ranked / Free play; own rolls appear without self-follow.  
5. **System messages** tab → unread clears without clicking each.  
6. **Epic+** settle with confetti enabled → tiered FX; reduced-motion → soft edges only.

---

## 9. Product copy principles

Keep language consistent everywhere (About, RollModePicker, Leaderboard, README):

- Free play = practice / Practice board / not crowns  
- Ranked = server RNG / Ranked board / crowns + overtake  
- Practice leaderboard = social honor system  
- Ranked leaderboard = fair competition baseline  

---

## 10. Suggested first task for the next agent

1. Confirm user finished OAuth portal setup + `promote-admin.mjs`.  
2. Hard-refresh prod smoke checklist §8 + `/admin` + Discord/GitHub Account buttons.  
3. Tag `v0.4.1` if smoke is clean.

---

## 11. Commit map (session-relevant)

```
ae21ace fix(home): float Latest runs right under chrome, not mid-column
c10d2f5 chore(settings): clarify celebrate FX toggle label
9a168c5 feat(fx): tiered epic/anomaly/mythic celebrate FX
7c49588 feat(home): Latest runs sidebar with Free/Ranked/Challenge tabs
054548a docs: add comprehensive AGENTS.md for coding agents
6ac063f fix(roll): unstick reel after Daily/Weekly mode switch
922b6b5 feat(feed,history): Free play vs Ranked lanes
…
670305f feat: Ranked free play (server RNG) + board fairness
ad39583 feat: overtake alerts, rarity top% curve, Absolute Ceiling jackpot
70cfa93 feat(ui): sticky app chrome and history sort filters
```

---

*User instruction priority: explicit user request > AGENTS.md > this handoff > README > older design docs under `docs/superpowers/` (some predate Ranked).*
