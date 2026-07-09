# Design Spec: RNGdle Unlocked

**Date:** 2026-07-08  
**Status:** Approved  
**Product name:** RNGdle Unlocked  
**Repo:** `rngdle-unlocked` (greenfield)

## 1. Context & goal

[RNGdle](https://www.rngdle.com/) is a daily random-number game: one roll per day, number from 0–1,000,000, badges for numerical properties, EP (entropy points), rarity tiers, collection, and social features (auth, leaderboard).

**RNGdle Unlocked** is an **inspired** (not affiliated) web game that keeps the core fantasy—roll a number, discover badges, score EP, collect rarities—but **removes the 24-hour lock**. Players can roll anytime.

### Success criteria (v1)

1. User can open the app and roll unlimited times with no countdown gate.
2. Each roll shows number, badges, EP, rarity tier, and percentile.
3. History and badge collection persist across reloads (localStorage).
4. User can share a roll via a share card (text + copy, and a visual card export).
5. Installable PWA; static deploy on Vercel.
6. Game logic is unit-tested (Vitest) independent of UI.

### Non-goals (v1 / MVP part 1)

- Accounts, OAuth, better-auth, cloud save
- Global leaderboard / multiplayer
- Pixel-perfect clone of rngdle.com branding or badge IP
- Server-side roll authority
- Sound design (optional later)

### Deferred: MVP part 2 — social features (explicit future scope)

User intent: **support social features eventually**, not in part 1.
When we open part 2 (separate spec/plan), candidates include:

- Accounts / auth (e.g. better-auth or similar)
- Cloud-synced history, lifetime EP, collection
- Global / friends leaderboards (all-time, weekly, badge counts)
- Optional share-to-link with server OG previews
- Soft rate limits for fairness (not a daily lock)
- Server-side roll attestation if competitive integrity is required

**Part 1 constraint:** Keep the **game engine pure and UI/state client-first** so part 2 can add a sync/API layer without rewriting badge/RNG/scoring logic. Avoid painting into a corner with storage keys that can’t migrate (versioned local schema OK).

## 2. Research notes (original product)

### Game loop (observed)

1. GENERATE → random integer 0…1,000,000
2. Analyze for badges / patterns
3. Sum EP, map to rarity + percentile
4. (Original) Persist daily roll; countdown until next day
5. Social: auth, lifetime EP, leaderboard, share

### Observed stack (headers + JS fingerprints; BuiltWith SPA did not return data)

| Layer     | Detected                                                                          |
| --------- | --------------------------------------------------------------------------------- |
| Framework | Next.js (RSC, Turbopack chunks, `X-Powered-By: Next.js`)                          |
| UI        | Tailwind, Lucide, Sonner, Inter + Space Mono                                      |
| Auth      | better-auth (`/api/auth`)                                                         |
| CDN       | Cloudflare; origin via Caddy                                                      |
| APIs      | `/api/health`, `/api/home`, `/api/activity/*`, `/api/stats/global`, notifications |
| PWA       | `manifest.webmanifest`                                                            |

**Our stack deliberately differs** (client-only Vite+ SPA) because v1 needs no server.

Rarity tiers observed in client bundles: `trash | common | uncommon | rare | epic | anomaly | mythic`.

## 3. Product decisions (locked)

| Topic            | Decision                                                               |
| ---------------- | ---------------------------------------------------------------------- |
| Experience       | Solo infinite playground                                               |
| Scoring          | Inspired original (our badge names & weights)                          |
| Platform         | Web app / PWA                                                          |
| Deploy           | Vercel (static)                                                        |
| Toolchain        | [Vite+](https://viteplus.dev/) (`vp`) + React + TypeScript             |
| Architecture     | Pure TS game engine + thin React UI                                    |
| Visual           | Same genre spirit, own skin                                            |
| Share            | **In v1** — share card                                                 |
| Name             | RNGdle Unlocked                                                        |
| RNG              | **Fortified CSPRNG** (see §5.1) — not `Math.random`, not user-seedable |
| Meta progression | **Play-count milestone badges** (5, 10, 15, 20, 50, … 10_000+)         |

## 4. Architecture

```
┌─────────────────────────────────────────────┐
│  UI (React)                                 │
│  Home · Result · History · Collection ·     │
│  About · Settings · ShareCard               │
└─────────────────┬───────────────────────────┘
                  │ actions / selectors
┌─────────────────▼───────────────────────────┐
│  State (React context or small store)       │
│  rolls[], collection, lifetimeEP, theme     │
│  + localStorage persistence adapter         │
└─────────────────┬───────────────────────────┘
                  │ pure function calls
┌─────────────────▼───────────────────────────┐
│  Game engine (pure TypeScript)              │
│  rollNumber() · evaluateBadges() ·          │
│  scoreEP() · rarityFromEP() · percentile()  │
│  + badge catalog (data + matchers)          │
└─────────────────────────────────────────────┘
```

### Directory layout (proposed)

```
/
  docs/superpowers/specs/...
  docs/superpowers/plans/...
  index.html
  package.json
  vite.config.ts          # via Vite+
  public/
    icons/                # PWA icons
    manifest.webmanifest
  src/
    main.tsx
    App.tsx
    styles/
      global.css          # design tokens, rarity colors
    game/
      types.ts
      rng.ts
      score.ts
      rarity.ts
      percentile.ts
      evaluate.ts
      badges/
        catalog.ts        # metadata: id, name, description, ep
        matchers.ts       # pure match functions
        index.ts
      index.ts            # public API: performRoll(seed?)
    state/
      storage.ts
      gameStore.tsx       # or useReducer + context
    ui/
      layout/
        AppShell.tsx
        ThemeToggle.tsx
      screens/
        HomeScreen.tsx
        HistoryScreen.tsx
        CollectionScreen.tsx
        AboutScreen.tsx
        SettingsScreen.tsx
      components/
        GenerateButton.tsx
        NumberDisplay.tsx
        RarityBadge.tsx
        EPPill.tsx
        BadgePill.tsx
        BadgeTooltip.tsx
        RollHistoryList.tsx
        CollectionGrid.tsx
        ShareCard.tsx
        ShareActions.tsx
    pwa/
      registerSW.ts
  tests/
    game/
      rng.test.ts
      badges.test.ts
      score.test.ts
      rarity.test.ts
      evaluate.test.ts
      percentile.test.ts
```

### Public engine API (contract)

```ts
// Conceptual — exact shapes locked in implementation plan

type RarityTier =
  | 'trash'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'anomaly'
  | 'mythic';

type BadgeHit = {
  id: string;
  name: string;
  description: string;
  ep: number;
};

type RollResult = {
  number: number; // 0..1_000_000 inclusive
  badges: BadgeHit[];
  totalEP: number;
  rarity: RarityTier;
  percentile: number; // 0..100, "top X%" display derived in UI
  rolledAt: string; // ISO timestamp
  id: string; // uuid for history/share
};

function performRoll(options?: { now?: Date }): RollResult;
function evaluateNumber(
  n: number,
  options?: { now?: Date },
): Omit<RollResult, 'rolledAt' | 'id'>;
```

## 5. Game design

### 5.1 Number generation (fortified CSPRNG)

- Inclusive range: **0 … 1_000_000** (1,000,001 possible values).
- **Forbidden:** `Math.random`, any user-facing seed parameter, deterministic PRNG libraries with settable seeds in production paths.
- **Required entropy path:**
  1. Collect bytes from `crypto.getRandomValues` (browser CSPRNG / OS entropy — **not** seedable by page JS).
  2. Maintain an **entropy pool** updated from high-resolution interaction noise (pointer moves, key timing, `performance.now` deltas) between rolls — never trusted alone.
  3. For each roll: mix pool + fresh `getRandomValues` via **SHA-256** (`crypto.subtle.digest`) → reject-sample map into `[0, 1_000_001)` without modulo bias.
- **Tests only:** `evaluateNumber(n)` scores a fixed number (badges/EP); tests may inject a **test-only** RNG interface behind a build flag / dependency injection — **not** exposed in production UI or global `window`.
- Document in About: rolls use fortified browser CSPRNG; not a hardware TRNG, not remote-attested randomness (v1).

### 5.2 Badge system (inspired, not copied)

- Target catalog size: **~40–60 badges** for v1.
- Families (illustrative, names ours):
  - **Math:** prime, perfect power, fibonacci-ish, harshad, palindrome
  - **Digit patterns:** runs, pairs, full house / poker-like digit hands, alternating, bookends
  - **Zeros / voids:** leading sparsity, many zeros, round millennia-style numbers
  - **Cultural / meme:** curated constants (42, 404, 1337, 80085-style) with original names
  - **Length / magnitude:** digit-count tiers, high roller / low ball
  - **Sequences:** ascending/descending, consecutive digit groups
- Each badge: stable `id`, display `name`, short `description`, integer `ep` weight, pure `matches(n: number, ctx): boolean`.
- A number can earn **multiple** badges; EP is **sum** of matched badge EPs.
- Prefer non-overlapping family variants where original game uses exclusive tiers (document rules in catalog comments).

### 5.2b Play-count milestone badges (unlimited-play progression)

Because play is unlocked/unlimited, **lifetime roll count** earns meta badges (separate from number-property badges):

| Lifetime rolls | Example badge id | Intent      |
| -------------- | ---------------- | ----------- |
| 5              | `rolls-5`        | First steps |
| 10             | `rolls-10`       |             |
| 15             | `rolls-15`       |             |
| 20             | `rolls-20`       |             |
| 50             | `rolls-50`       | Regular     |
| 100            | `rolls-100`      | Century     |
| 250            | `rolls-250`      |             |
| 500            | `rolls-500`      |             |
| 1000           | `rolls-1000`     | Grinder     |
| 1500           | `rolls-1500`     |             |
| 2000           | `rolls-2000`     |             |
| 3000           | `rolls-3000`     |             |
| 4000           | `rolls-4000`     |             |
| 5000           | `rolls-5000`     | Dedicated   |
| 10000          | `rolls-10000`    | Legend      |

- Persist **`lifetimeRollCount`** (monotonically increasing; not reduced when history trims).
- On each roll: increment count → if any milestone thresholds are newly crossed:
  - Award journey badges to **collection** + toast/celebrate.
  - Add their EP to **`lifetimeEP` only** (and a visible **journey EP** subtotal if useful in UI).
  - **Do not** include journey EP in that roll’s `totalEP`, rarity, or percentile — number-property play stays pure per roll.
- EP weights scale with milestone tier (exact table in implementation).
- Collection groups: “Number” badges vs “Journey” badges.
- Share card may show lifetime roll count optionally (settings toggle default off).

### 5.3 EP, rarity, percentile

- **totalEP** = sum of badge EPs (0 if none).
- **Rarity** from totalEP thresholds (tunable constants in `rarity.ts`), 7 tiers matching the genre:
  - trash → common → uncommon → rare → epic → anomaly → mythic
- **Percentile** is a **local deterministic** mapping from totalEP (or a score transform), **not** a live global leaderboard rank. UI copy: “Top X% of roll scores” / “Score percentile,” never “of all players.”
- Thresholds and percentile curve must be **documented constants** and covered by tests.

### 5.4 Unlimited play

- No daily lock, no “next roll in…” countdown.
- Primary CTA always: **GENERATE** (first) / **ROLL AGAIN** (after a roll).
- Soft anti-misclick: optional brief button cooldown (~300ms) only for UX, not game rules.

## 6. Persistence

| Key                                 | Contents                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `rngdle-unlocked:history`           | Array of `RollResult`, newest first, **max 500** (drop oldest)                             |
| `rngdle-unlocked:lifetimeEP`        | Running sum of all rolls’ totalEP (does not decrease when history trims)                   |
| `rngdle-unlocked:lifetimeRollCount` | Monotonic total rolls performed                                                            |
| `rngdle-unlocked:collection`        | Set/map of badge ids ever earned + first earned timestamp (number badges + journey badges) |
| `rngdle-unlocked:settings`          | `{ theme: "light" \| "dark" \| "system", shareShowRollCount?: boolean }`                   |

- Settings screen: **Clear all data** with confirm dialog.
- No export/import in v1 (explicitly deferred).
- Graceful corrupt JSON: reset that key, do not crash.

## 7. UI / UX

### 7.1 Screens

1. **Home / Roll** — number display (or `??????` pre-roll), GENERATE / ROLL AGAIN, latest rarity + EP summary.
2. **Result detail** (can be same view post-roll) — full badge list with tooltips (name, description, EP).
3. **History** — scrollable past rolls; tap to re-open detail; action to open share.
4. **Collection** — grid of badges; unlocked show name/EP; locked show silhouette/placeholder.
5. **About** — how it works; **not affiliated with rngdle.com**; inspired-by disclaimer.
6. **Settings** — theme, clear data, version.

### 7.2 Share card (v1)

- From result or history: **Share** opens panel with:
  - **Text summary** (copy to clipboard): number, rarity, EP, top badges, app name.
  - **Visual card** (DOM or canvas): large number, rarity color, EP, badge names, “RNGdle Unlocked”.
  - Actions: Copy text; **Download PNG** (html-to-image or canvas); Web Share API when available.
- No server-side OG image generation in v1.

### 7.3 Visual design

- Own skin, genre-familiar:
  - Strong mono for the big number
  - Rarity color tokens per tier
  - Light / dark / system
  - Clean layout, mobile-first, full-viewport friendly
- Motion: short number reveal; stronger accent on epic+ (CSS only, reduced-motion respected).

### 7.4 Navigation

- Simple header: brand, theme toggle, links/icons for History, Collection, About, Settings.
- No auth chrome.

## 8. PWA & deploy

- `manifest.webmanifest`: name “RNGdle Unlocked”, standalone display, theme colors.
- Service worker via `vite-plugin-pwa` (or Vite+ equivalent) — offline shell + cached assets so rolling works offline.
- Vercel static project: build `vp build` / `vite build` output `dist/`.
- Environment: none required for v1.

## 9. Tooling (Vite+)

- Bootstrap with `vp create` React + TypeScript template (or scaffold manually if create options differ).
- Scripts (via `vp`):
  - `vp dev` — local dev
  - `vp test` — Vitest
  - `vp check` — lint/format/types
  - `vp build` — production
- Package manager: whatever Vite+ selects for the project (document in README).

## 10. Testing strategy

| Layer  | What                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------- |
| Unit   | Badge matchers (known numbers → expected badges)                                                      |
| Unit   | EP sum, rarity thresholds, percentile monotonicity                                                    |
| Unit   | RNG range bounds, unbiased mapping, pool mix; evaluateNumber edge cases (0, 1e6, primes, palindromes) |
| Unit   | Milestone badges unlock exactly at thresholds; lifetimeRollCount monotonic                            |
| Unit   | History cap & lifetimeEP rules in storage helpers                                                     |
| Manual | UI flow, share download, PWA install, theme, clear data                                               |

TDD preference for engine: write failing tests for matchers/scoring before implementations.

## 11. Error handling

- Storage quota / private mode: toast “Could not save progress”; roll still works in-memory.
- Share PNG failure: fall back to copy text.
- Invalid stored data: reset with silent recovery.

## 12. Open items deferred (not v1)

- Accounts / cloud sync
- Global leaderboard
- Export/import JSON
- Sound / haptics
- 80+ badge catalog
- Exact parity with original EP tables

## 13. Verification (acceptance)

1. Fresh load → GENERATE → valid number + scoring UI.
2. ROLL AGAIN immediately works (no timer).
3. Reload → history and collection intact.
4. Earn a known badge with `evaluateNumber` fixture path (dev or test).
5. Share: copy text works; PNG downloads.
6. Theme toggles persist.
7. Clear data empties history/collection.
8. `vp test` and `vp build` succeed; Vercel deploy serves the app.
9. About page includes non-affiliation disclaimer.
10. After N rolls, journey badge for threshold N appears in collection.
11. Production bundle has no seedable RNG API / no `Math.random` in roll path.

---
