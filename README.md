# RNGdle Unlocked

Solo unlimited-roll number game inspired by the RNGdle genre — **no 24-hour lock**.

Roll 0–1,000,000 with a fortified browser CSPRNG, collect badges, score EP, track journey milestones, and share rolls. Data stays in your browser (localStorage).

**Not affiliated with [rngdle.com](https://www.rngdle.com/).** Badge names and scoring are original.

Social features (accounts, leaderboards) are deferred to **MVP part 2**.

## Stack

- [Vite+](https://viteplus.dev/) (`vp` CLI) + React + TypeScript
- Tailwind CSS v4
- Vitest via `vite-plus/test`
- Deploy: static on Vercel

## Setup

### Install Vite+ (once)

Windows (PowerShell):

```powershell
$env:CI = "true"; $env:VP_NODE_MANAGER = "yes"; irm https://vite.plus/ps1 | iex
```

Then open a **new** terminal.

### Project

```bash
vp install
vp dev
```

## Commands

| Command | Purpose |
|---------|---------|
| `vp dev` | Dev server |
| `vp test` | Unit tests |
| `vp check` | Format + lint + types |
| `vp build` | Production build → `dist/` |
| `vp preview` | Preview production build |

## Design docs

- Spec: `docs/superpowers/specs/2026-07-08-rngdle-unlocked-design.md`
- Plan: `docs/superpowers/plans/2026-07-08-rngdle-unlocked.md`
