<div align="center">

# 🎲 RNGdle Unlocked

### Unlimited CSPRNG rolls · badges · EP · cloud social — _no 24-hour lock._

Inspired by the daily number-game genre, but **unlocked**: roll as often as you want, keep a lifetime collection, and optionally sync for **Ranked + Practice + All-Time** boards, **Arcade Digits**, follows, and shareable rolls.

**[Live Site](https://rngdle-unlocked.chron0.tech)** · **[Docs Wiki](https://github.com/jondmarien/rngdle-unlocked/wiki)** · **[Author](https://chron0.tech)**

[![Version](https://img.shields.io/badge/version-0.19.2-8b5cf6)](https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.19.2)
[![React 19](https://img.shields.io/badge/UI-React_19-61dafb?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript_7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/build-Vite_8_Plus-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![TanStack Query](https://img.shields.io/badge/data-TanStack_Query-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Zod](https://img.shields.io/badge/schema-Zod-3E67B1)](https://zod.dev)
[![Motion](https://img.shields.io/badge/motion-Motion-f97316)](https://motion.dev)
[![Polar](https://img.shields.io/badge/payments-Polar-0062ff)](https://polar.sh)
[![pnpm 10](https://img.shields.io/badge/pkg-pnpm_10-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Neon](https://img.shields.io/badge/db-Neon_Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![Better Auth](https://img.shields.io/badge/auth-Better_Auth-ffffff?logoColor=black)](https://www.better-auth.com)

</div>

---

## What is this?

**RNGdle Unlocked** is a browser game: roll **0–1,000,000**, earn **EP** and **badges**, climb Journey / Lifetime seals. Progress is **local-first** (`localStorage`). Cloud is optional — auth, sync, Ranked, social, Arcade — on Vercel + Neon + Better Auth.

> **Not affiliated with [rngdle.com](https://www.rngdle.com/).** Badge names, scoring, and implementation are original.

| Mode | What you get |
| ---- | ------------ |
| **Solo** | Unlimited Free play, reel, badges, EP, history, codex, stats, export/import — offline-capable |
| **Social** | `@username`, sync, Ranked / Practice / All-Time / Arcade boards, follows, share + OG |

## How it works

- **Free play** — browser CSPRNG → Practice + All-Time (no Ranked crowns)
- **Ranked** — server CSPRNG (`POST /api/ranked-roll`) → Ranked board + crowns (needs `@username`)
- **Arcade** — Digits runs on `/arcade` (Digits ≠ EP; never writes `rolls`)
- **Daily / Weekly** — deterministic challenge seeds

Diagrams and trust model: **[Wiki · Architecture](https://github.com/jondmarien/rngdle-unlocked/wiki/Architecture)** · [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Quick start

```bash
corepack enable && corepack prepare pnpm@10.34.4 --activate
pnpm install
pnpm dev
```

Open the Vite URL (usually `http://localhost:5173`). No env vars needed for solo play.

Full stack (Neon + `vercel dev`), migrations, OAuth, Discord, Polar: **[Wiki · Quick Start](https://github.com/jondmarien/rngdle-unlocked/wiki/Quick-Start)** · **[Development Setup](https://github.com/jondmarien/rngdle-unlocked/wiki/Development-Setup)**

**Live:** https://rngdle-unlocked.chron0.tech

---

## Docs (moved to the Wiki)

Long feature lists, routes, env tables, FAQ, and the full shipped roadmap lived here and were hard to scan. They now live in the **[GitHub Wiki](https://github.com/jondmarien/rngdle-unlocked/wiki)** (staged under [`docs/wiki/`](./docs/wiki/), publish with `pnpm wiki:publish`).

| Want… | Go to |
| ----- | ----- |
| Feature checklist | [Wiki · Features](https://github.com/jondmarien/rngdle-unlocked/wiki/Features) |
| Mode / trust table | [Wiki · Game Modes](https://github.com/jondmarien/rngdle-unlocked/wiki/Game-Modes-and-Trust) |
| Repo map + routes/API | [Wiki · Repo Layout](https://github.com/jondmarien/rngdle-unlocked/wiki/Repo-Layout) · [Routes](https://github.com/jondmarien/rngdle-unlocked/wiki/Routes-and-API) |
| Env / OAuth / Discord / Polar | [Wiki · Environment](https://github.com/jondmarien/rngdle-unlocked/wiki/Environment) · [Integrations](https://github.com/jondmarien/rngdle-unlocked/wiki) |
| FAQ | [Wiki · FAQ](https://github.com/jondmarien/rngdle-unlocked/wiki/FAQ-and-Troubleshooting) |
| Roadmap + what's next | [Wiki · Roadmap](https://github.com/jondmarien/rngdle-unlocked/wiki/Roadmap) |
| Agent / contributor rules | [`AGENTS.md`](./AGENTS.md) |
| Changelog | [`CHANGELOG.md`](./CHANGELOG.md) |

```bash
pnpm test && pnpm typecheck   # verify
npx vercel dev                # SPA + /api/*
pnpm wiki:publish             # docs/wiki → GitHub Wiki
```

Current version **0.19.2** — [releases](https://github.com/jondmarien/rngdle-unlocked/releases).

---

<div align="center">

Made for fun · not affiliated with rngdle.com · [Play live](https://rngdle-unlocked.chron0.tech) · [Wiki](https://github.com/jondmarien/rngdle-unlocked/wiki) · [chron0.tech](https://chron0.tech)

</div>
