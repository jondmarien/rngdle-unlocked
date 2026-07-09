# Implementation Plan: RNGdle Unlocked

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship a solo unlimited-roll PWA: fortified CSPRNG roll → badges/EP/rarity → local history/collection → journey milestones (lifetime EP only) → share card → Vercel.

**Architecture:** Pure TypeScript game engine (TDD) + thin React UI + localStorage + Vite+ toolchain.

**Tech Stack:** Vite+ (`vp` CLI, `vite-plus` package), React, TypeScript, Tailwind CSS, Vitest via `vite-plus/test`, `vite-plugin-pwa`, `html-to-image` (share PNG), Vercel static.

**Reference:** Design Spec above; Vite+ https://viteplus.dev/llms-full.txt

---

## Vite+ project conventions (locked)

| Concern              | Rule                                                                    |
| -------------------- | ----------------------------------------------------------------------- |
| Global CLI           | `vp` — Windows: `irm https://vite.plus/ps1 \| iex` then new terminal    |
| Scaffold             | `vp create vite -- --template react-ts` into repo root (or temp + move) |
| Config               | Single `vite.config.ts` with `defineConfig` from **`vite-plus`**        |
| Tests                | Import from **`vite-plus/test`** (not `vitest`)                         |
| Day-to-day           | `vp install` · `vp dev` · `vp check` · `vp test` · `vp build`           |
| package.json scripts | Prefer built-in `vp *`; custom scripts via `vp run <script>`            |
| PM                   | Vite+ default **pnpm** if unset; pin via `packageManager` if needed     |
| Type-aware check     | `lint.options.typeAware` + `typeCheck: true`                            |
| `vp test`            | One-shot by default; watch = `vp test watch`                            |

---

## File map (create)

```
docs/superpowers/specs/2026-07-08-rngdle-unlocked-design.md
docs/superpowers/plans/2026-07-08-rngdle-unlocked.md
package.json
vite.config.ts
tsconfig*.json
index.html
public/manifest.webmanifest
public/icons/*
vercel.json
src/main.tsx
src/App.tsx
src/styles/global.css
src/game/types.ts
src/game/rng.ts
src/game/entropyPool.ts
src/game/score.ts
src/game/rarity.ts
src/game/percentile.ts
src/game/evaluate.ts
src/game/journey.ts
src/game/badges/catalog.ts
src/game/badges/matchers.ts
src/game/badges/index.ts
src/game/index.ts
src/state/storage.ts
src/state/GameProvider.tsx
src/ui/layout/AppShell.tsx
src/ui/layout/ThemeToggle.tsx
src/ui/screens/HomeScreen.tsx
src/ui/screens/HistoryScreen.tsx
src/ui/screens/CollectionScreen.tsx
src/ui/screens/AboutScreen.tsx
src/ui/screens/SettingsScreen.tsx
src/ui/components/GenerateButton.tsx
src/ui/components/NumberDisplay.tsx
src/ui/components/RarityBadge.tsx
src/ui/components/EPPill.tsx
src/ui/components/BadgePill.tsx
src/ui/components/RollHistoryList.tsx
src/ui/components/CollectionGrid.tsx
src/ui/components/ShareCard.tsx
src/ui/components/ShareActions.tsx
src/pwa/registerSW.ts
src/game/**/*.test.ts   (or tests/game/**)
```

**Reuse:** none (empty repo).

---

### Task 0: Persist docs + git init checkpoint

**Files:** Create docs under `docs/superpowers/...`

- [ ] **Step 0.1:** Write approved Design Spec → `docs/superpowers/specs/2026-07-08-rngdle-unlocked-design.md`
- [ ] **Step 0.2:** Write this Implementation Plan → `docs/superpowers/plans/2026-07-08-rngdle-unlocked.md`
- [ ] **Step 0.3:** `git init` if needed; commit docs only

```bash
git add docs/superpowers
git commit -m "docs: RNGdle Unlocked design spec and implementation plan"
```

---

### Task 1: Install `vp` and scaffold React TS app

**Working dir:** repo root `J:\projects\personal-projects\rngdle-unlocked`

- [ ] **Step 1.1:** Ensure `vp` exists (`vp help`). If missing (Windows):

```powershell
irm https://vite.plus/ps1 | iex
# open NEW terminal, then:
vp help
```

- [ ] **Step 1.2:** Scaffold React+TS into this directory. Prefer non-interactive:

```bash
vp create vite --directory . --no-interactive --git --package-manager pnpm -- --template react-ts
```

If interactive only: choose Vite React TypeScript application in current dir.  
If directory non-empty docs conflict: scaffold to `_scaffold` and merge.

- [ ] **Step 1.3:** `vp install`
- [ ] **Step 1.4:** Confirm `vite.config.ts` uses `import { defineConfig } from 'vite-plus'`
- [ ] **Step 1.5:** Enable type-aware check:

```ts
import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 1.6:** Smoke: `vp check` · `vp test` · `vp build`
- [ ] **Step 1.7:** Commit scaffold

```bash
git add -A
git commit -m "chore: scaffold Vite+ React TypeScript app"
```

---

### Task 2: Types + fortified RNG (TDD)

**Files:**

- Create: `src/game/types.ts`, `src/game/entropyPool.ts`, `src/game/rng.ts`
- Test: `src/game/rng.test.ts`

- [ ] **Step 2.1:** Write failing tests in `src/game/rng.test.ts`:

```ts
import { describe, expect, it } from 'vite-plus/test';
import { mapBytesToInclusiveRange, ROLL_MAX } from './rng';

describe('mapBytesToInclusiveRange', () => {
  it('always returns integer in 0..ROLL_MAX', () => {
    // feed known byte arrays; assert bounds
  });
  it('is unbiased for range size 1_000_001 (reject-sample contract)', () => {
    // document/reject threshold constant
  });
});
```

- [ ] **Step 2.2:** `vp test` → fail
- [ ] **Step 2.3:** Implement:
  - `ROLL_MAX = 1_000_000`, range size `1_000_001`
  - `entropyPool.ts`: accumulate interaction samples; `mixInto(bytes: Uint8Array)`
  - `rng.ts`: `getRandomBytes(n)`, SHA-256 mix via `crypto.subtle.digest`, reject-sample to range
  - `rollNumber(): Promise<number>` async (subtle is async)
  - **No** `Math.random`; **no** public seed API
- [ ] **Step 2.4:** `vp test` → pass; commit

```bash
git commit -m "feat(game): fortified CSPRNG for 0..1e6 rolls"
```

---

### Task 3: Rarity, percentile, score helpers (TDD)

**Files:** `src/game/rarity.ts`, `percentile.ts`, `score.ts` + tests

- [ ] Thresholds for 7 tiers (document constants):

```ts
export type RarityTier =
  | 'trash'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'anomaly'
  | 'mythic';

// totalEP thresholds — tune later; start with geometric-ish ladder
export const RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 50_000 },
  { tier: 'anomaly', minEP: 15_000 },
  { tier: 'epic', minEP: 5_000 },
  { tier: 'rare', minEP: 1_500 },
  { tier: 'uncommon', minEP: 400 },
  { tier: 'common', minEP: 50 },
  { tier: 'trash', minEP: 0 },
];
```

- [ ] `percentileFromEP(ep)`: monotonic 0–100 “top X% of scores” (deterministic curve)
- [ ] `sumEP(badges)`
- [ ] Tests for boundary EPs and monotonic percentile
- [ ] Commit: `feat(game): rarity and percentile scoring`

---

### Task 4: Badge catalog + matchers (TDD, iterative)

**Files:** `src/game/badges/catalog.ts`, `matchers.ts`, `index.ts` + `badges.test.ts`

- [ ] **Step 4.1:** Define `BadgeDef { id, name, description, ep, family, matches(n: number): boolean }`
- [ ] **Step 4.2:** Implement **first 15** high-value badges with fixtures:

| id              | example true | notes             |
| --------------- | ------------ | ----------------- |
| prime           | 97           | sieve/trial       |
| palindrome      | 12321        | digit string      |
| power-of-two    | 65536        |                   |
| round-thousand  | 1000         | ends with 000     |
| all-same-digits | 111111       |                   |
| ascending       | 123456       |                   |
| nice-42         | 42           | cultural          |
| leet-1337       | 1337         |                   |
| error-404       | 404          |                   |
| low-ball        | 7            | small magnitude   |
| high-roller     | 999999       | near max          |
| zero            | 0            | edge              |
| million         | 1000000      | edge              |
| even            | 8            |                   |
| harshad         | 18           | digit sum divides |

- [ ] **Step 4.3:** Tests: known numbers → expected badge ids; non-matches negative cases
- [ ] **Step 4.4:** Expand to **~40–60** badges in families (patterns, voids, poker-like digit hands, more cultural) — each with ≥1 fixture test or table-driven cases
- [ ] Commit: `feat(game): inspired badge catalog and matchers`

---

### Task 5: `evaluateNumber` + `performRoll` orchestration

**Files:** `src/game/evaluate.ts`, `src/game/index.ts` + tests

```ts
export async function performRoll(): Promise<RollResult> {
  const number = await rollNumber();
  return finalizeRoll(number, new Date());
}

export function evaluateNumber(n: number, at = new Date()): RollResult {
  // clamp/validate integer 0..ROLL_MAX
  const badges = evaluateBadges(n); // number-property only
  const totalEP = sumEP(badges);
  return {
    id: crypto.randomUUID(),
    number: n,
    badges,
    totalEP,
    rarity: rarityFromEP(totalEP),
    percentile: percentileFromEP(totalEP),
    rolledAt: at.toISOString(),
  };
}
```

- [ ] Tests for evaluateNumber on fixture numbers
- [ ] Commit: `feat(game): evaluateNumber and performRoll API`

---

### Task 6: Journey milestones (lifetime EP only)

**Files:** `src/game/journey.ts` + tests

```ts
export const JOURNEY_THRESHOLDS = [
  5, 10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 10000,
] as const;

export function journeyBadgesForCount(count: number): BadgeDef[] {
  /* all thresholds <= count */
}
export function newlyUnlockedJourney(prev: number, next: number): BadgeDef[] {
  /* crossed */
}
// each has ep weight; apply to lifetimeEP only in state layer
```

- [ ] Tests: unlock exactly on threshold cross; no double-grant logic helper
- [ ] Commit: `feat(game): journey play-count milestones`

---

### Task 7: localStorage persistence

**Files:** `src/state/storage.ts` + `storage.test.ts` (mock localStorage)

Keys:

- `rngdle-unlocked:history` (max 500)
- `rngdle-unlocked:lifetimeEP`
- `rngdle-unlocked:lifetimeRollCount`
- `rngdle-unlocked:collection`
- `rngdle-unlocked:settings`

- [ ] load/save/clear; corrupt JSON → safe defaults
- [ ] history trim does **not** decrease lifetime counters
- [ ] Commit: `feat(state): localStorage persistence`

---

### Task 8: GameProvider (React state)

**Files:** `src/state/GameProvider.tsx`

- [ ] Context: lastRoll, history, collection, lifetimeEP, lifetimeRollCount, settings, actions:
  - `roll()` → await performRoll → increment count → journey unlocks → lifetimeEP += roll.totalEP + journeyEP → persist
  - `clearAll()`, `setTheme()`, `setShareShowRollCount()`
- [ ] Wire provider in `main.tsx` / `App.tsx`
- [ ] Commit: `feat(state): GameProvider roll orchestration`

---

### Task 9: Tailwind + design tokens + AppShell

- [ ] Add Tailwind (`vp add -D tailwindcss @tailwindcss/vite` or current Vite 8 recipe)
- [ ] `global.css`: rarity CSS variables, mono number class, light/dark
- [ ] `AppShell`: header brand, nav (Home/History/Collection/About/Settings), theme toggle
- [ ] Simple client routing: hash or lightweight state tabs (no backend); prefer `react-router` only if needed — **default: tab state in App to stay YAGNI**
- [ ] Commit: `feat(ui): shell, theme, design tokens`

---

### Task 10: Home roll UX

**Files:** HomeScreen, GenerateButton, NumberDisplay, RarityBadge, EPPill, BadgePill

- [ ] Pre-roll: `??????` + GENERATE
- [ ] Post-roll: number, rarity, percentile label, EP, badges, ROLL AGAIN (always enabled)
- [ ] Entropy pool: attach window pointer/keydown listeners to feed pool (passive)
- [ ] ~300ms button debounce only
- [ ] Commit: `feat(ui): unlimited roll home screen`

---

### Task 11: History + Collection + Settings + About

- [ ] History list → open detail / share
- [ ] Collection grid: Number vs Journey groups; locked silhouettes
- [ ] Settings: theme, share roll-count toggle, clear data confirm
- [ ] About: how to play, fortified RNG note, **not affiliated with rngdle.com**
- [ ] Commit: `feat(ui): history collection settings about`

---

### Task 12: Share card

**Deps:** `vp add html-to-image`

- [ ] Text template + clipboard
- [ ] Visual card DOM → PNG download
- [ ] `navigator.share` when available
- [ ] Journey count only if settings allow
- [ ] Commit: `feat(ui): share card text and PNG`

---

### Task 13: PWA + Vercel

- [ ] `vp add -D vite-plugin-pwa` (or Vite+ equivalent); register SW
- [ ] `public/manifest.webmanifest` + icons (generate simple SVG/PNG assets)
- [ ] `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] `vp build` produces `dist/`; document deploy
- [ ] Commit: `feat: PWA manifest and Vercel static config`

---

### Task 14: Polish, check, README

- [ ] README: `vp` install, `vp install/dev/test/check/build`, Vercel notes, disclaimer
- [ ] `vp check --fix` · `vp test` · `vp build` all green
- [ ] Grep production roll path: no `Math.random`
- [ ] Manual acceptance checklist from Design Spec §13
- [ ] Final commit: `chore: README and release polish`

---

## Execution checkpoints (user approval stages)

| After       | Demo / proof                                      |
| ----------- | ------------------------------------------------- |
| Tasks 0–1   | App scaffolds; `vp dev` blank React               |
| Tasks 2–6   | Engine fully tested; optional tiny CLI/debug page |
| Tasks 7–8   | Roll in console/provider works + persists         |
| Tasks 9–11  | Full UI playable locally                          |
| Tasks 12–14 | Share + PWA + build ready for Vercel              |

---

## Verification (end-to-end)

1. `vp test` — all engine/storage tests pass
2. `vp check` — format/lint/types clean
3. `vp build` — succeeds
4. Manual: unlimited rolls, no countdown
5. Manual: reload keeps history/collection/lifetime counts
6. Manual: hit 5 rolls → journey badge + lifetime EP increases; roll rarity unchanged by journey EP
7. Manual: share copy + PNG
8. Manual: clear data
9. Optional: Vercel preview deploy

---

## Out of scope for this plan (MVP part 1)

- Accounts, leaderboard, multiplayer, cloud sync (**MVP part 2 — social**)
- Remote entropy beacon
- Export/import JSON
- Sound
- Exact original badge IP parity

**Part 2 readiness:** Engine stays pure TS; persistence uses versioned keys; no hard-coded “local-only forever” assumptions in domain types (e.g. `RollResult` is serializable JSON).
