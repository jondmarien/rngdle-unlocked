# Arcade Mode + Leaderboard Revamp — Design Spec

**Date:** 2026-07-09  
**Status:** Shipped in **v0.7.0** (`feature/arcade-mode` → `main` when merged)

## Summary

Arcade Mode is a server-authoritative roguelite run layer around the existing roll engine. Currency is **Digits** (never convertible to EP). Runs cash out or bust (Double or Nothing loss only in v1). Meta-progression unlocks upgrades across runs. Leaderboard primary tabs are mode-first: Ranked | Practice | Arcade | Feed | Find.

## Hard constraints

- No changes to Free / Daily / Ranked RNG, EP scoring, or `rolls` / `user_progress` contracts
- Digits ≠ EP; Arcade does not write to `rolls`
- No debt/deadline, no idle, no trash-streak bust in v1
- Conventions: `apiGuards`, `lib/*-api.ts`, thin `api/*` → `server/*`, TanStack Query, Zod, SegmentedToggle

## Confirmed decisions

- Bust = DoN loss only; score = peak Digits
- Own-once upgrades; shop rerolls duplicates
- One active run; Abandon = two-step confirm → bust at peak
- Tunable economy config module (`src/game/arcade/economy.ts`)
- Arcade = `/arcade` screen (not Home RollMode)
- Arcade board = best run score

## Schema

`arcade_meta`, `arcade_runs`, `arcade_run_rolls` — joined by `userId` only. Migration: `scripts/migrate-arcade.mjs`.

## Trust

Server is source of truth for Digits, shop, bust, cash-out. Client cannot fabricate run scores.

## Key paths

| Layer              | Path                                                         |
| ------------------ | ------------------------------------------------------------ |
| Economy / upgrades | `src/game/arcade/`                                           |
| Server run loop    | `server/arcade.ts`                                           |
| Arcade board       | `server/arcadeLeaderboard.ts`, `GET /api/arcade/leaderboard` |
| Client API         | `src/lib/arcade-api.ts`                                      |
| UI                 | `src/ui/screens/ArcadeScreen.tsx`, Leaderboard Arcade tab    |
