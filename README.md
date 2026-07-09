# RNGdle Unlocked

Solo unlimited-roll number game inspired by the RNGdle genre — **no 24-hour lock**.

Roll 0–1,000,000 with a fortified browser CSPRNG, collect badges, score EP, track journey milestones, and share rolls. Data stays in your browser (localStorage).

**Not affiliated with [rngdle.com](https://www.rngdle.com/).** Badge names and scoring are original.

Social features (accounts, leaderboards) are deferred to **MVP part 2**.

## Stack

- React + TypeScript + Vite 6
- Optional local [Vite+](https://viteplus.dev/) (`vp`) for check/test DX
- Tailwind CSS v4
- Deploy: static on Vercel (`pnpm` 9)

## Setup

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
pnpm dev   # or: npx vite
```

Optional global Vite+ CLI for `vp check` / `vp test`:

```powershell
$env:CI = "true"; $env:VP_NODE_MANAGER = "yes"; irm https://vite.plus/ps1 | iex
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build → `dist/` (used by Vercel) |
| `pnpm preview` | Preview production build |
| `vp test` | Unit tests (Vite+) |
| `vp check` | Format + lint + types (Vite+) |

## Design docs

- Spec: `docs/superpowers/specs/2026-07-08-rngdle-unlocked-design.md`
- Plan: `docs/superpowers/plans/2026-07-08-rngdle-unlocked.md`
