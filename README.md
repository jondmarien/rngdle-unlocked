<div align="center">

# 🎲 RNGdle Unlocked

### Unlimited CSPRNG rolls · badges · EP · cloud social — *no 24-hour lock.*

Inspired by the daily number-game genre, but **unlocked**: roll as often as you want, keep a lifetime collection, and optionally sync progress to Neon for accounts, leaderboards, and shareable rolls.

**[Live Site](https://rngdle-unlocked.chron0.tech)**

[![React 19](https://img.shields.io/badge/UI-React_19-61dafb?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript_7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 6](https://img.shields.io/badge/build-Vite_Plus-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![pnpm 10](https://img.shields.io/badge/pkg-pnpm_10-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Vercel](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Neon](https://img.shields.io/badge/db-Neon_Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![Better Auth](https://img.shields.io/badge/auth-Better_Auth-ffffff?logoColor=black)](https://www.better-auth.com)

[Quick start](#-quick-start) · [How it works](#-how-it-works) · [Features](#-features) · [Repo layout](#-whats-in-this-repo) · [Social setup](#-social--cloud-setup) · [Commands](#-commands) · [FAQ](#-faq--troubleshooting)

</div>

---

## 💡 What is this?

**RNGdle Unlocked** is a browser game: roll an integer from **0–1,000,000**, earn **entropy points (EP)** and **badges** from number properties, climb a **journey** of lifetime milestones, and share rolls to Discord.

Unlike a classic daily lock, you can roll **unlimited** times. Progress defaults to **localStorage** on your device. Optional **cloud social** (accounts, username, leaderboard, public profiles, share links) runs on **Vercel serverless + Neon Postgres + Better Auth**.

> **Not affiliated with [rngdle.com](https://www.rngdle.com/).** Badge names, scoring, and implementation are original.

| Mode | What you get |
| --- | --- |
| **Solo (default)** | Fortified CSPRNG rolls, badges, EP, history, collection, showcase, export/import — all offline-capable in the browser |
| **Social (opt-in)** | Email sign-up, `@username`, merge-safe cloud sync, leaderboards, `/u/:user` profiles, OG share pages |

## 📋 Table of contents

- [How it works](#-how-it-works)
- [Quick start](#-quick-start)
- [Features](#-features)
- [What's in this repo](#-whats-in-this-repo)
- [Routes (SPA)](#-routes-spa)
- [Social / cloud setup](#-social--cloud-setup)
- [Commands](#-commands)
- [Environment variables](#-environment-variables)
- [Architecture notes](#-architecture-notes)
- [FAQ / troubleshooting](#-faq--troubleshooting)
- [Status & roadmap](#-status--roadmap)

## 🔭 How it works

```mermaid
flowchart TB
  subgraph CLIENT["Browser SPA"]
    UI["React UI<br/>Roll · History · Collection · Share"]
    LS[("localStorage<br/>primary save")]
    RNG["CSPRNG path<br/>crypto.getRandomValues · entropy pool · reject sampling"]
    UI --> RNG
    UI --> LS
  end

  subgraph VERCEL["Vercel"]
    STATIC["Static dist/<br/>Vite build"]
    API["Serverless /api/*<br/>Node req/res adapter"]
  end

  subgraph DATA["Data"]
    NEON[("Neon Postgres<br/>auth + progress + rolls")]
  end

  UI -->|optional sync| API
  API --> NEON
  STATIC --> UI
```

**Roll path (always local):** fortified browser CSPRNG → badge evaluation → EP / rarity / percentile → history + collection updates → localStorage.

**Social path (optional):** Better Auth session → merge local + cloud (max counters, union collection, merge history) → public username on leaderboards → share links that resolve only after a cloud push.

## 🚀 Quick start

### Play only (no backend)

```bash
corepack enable
corepack prepare pnpm@10.34.4 --activate   # or use any pnpm 10.x
pnpm install
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Rolls and badges work immediately with no env vars.

### Full stack (auth + leaderboard + sync)

1. Copy env and fill secrets:

```bash
cp .env.example .env.local
```

2. Apply the Drizzle schema to Neon:

```bash
pnpm db:push
```

3. Run SPA + APIs together (recommended for local social):

```bash
npx vercel dev
```

Or `pnpm dev` for the SPA only and point APIs at a deployed preview.

4. Production: deploy to Vercel, set the same env vars for **Production**, attach Neon, redeploy.

**Live production:** [https://rngdle-unlocked.chron0.tech](https://rngdle-unlocked.chron0.tech)

## ✨ Features

### Solo playground
- **Unlimited rolls** 0–1,000,000 (no daily lock)
- **Fortified CSPRNG** — `crypto.getRandomValues`, entropy mixing, reject sampling (not `Math.random`)
- **140+ badges** across math, patterns, culture, sequences, and more
- **EP + rarity ladder** (trash → mythic) and percentile framing
- **Journey milestones** (lifetime EP, up to high goals like 100k)
- **History, collection, showcase**, streaks, optional confetti/SFX
- **Export / import** save files; theme light / dark / system
- **Discord-style share text** + PNG card

### Social (Part 2)
- **Email + password** auth (Better Auth)
- **Username** for public identity (`@handle`)
- **Cloud sync** — merge-safe push/pull (not a hard overwrite)
- **Leaderboard** — all-time / week, sort by EP / rolls / badges
- **Profiles** — `/u/:username`
- **Public rolls** — `/r/:id` in-app; OG HTML at `/api/share/:id` (and legacy `/api/share/r/:id`)
- **Soft rate limits** on sync and public APIs (fairness, not a 24h lock)

## 📁 What's in this repo

```
rngdle-unlocked/
├── api/                 ⚡ Vercel serverless routes (Node adapter → Web Request)
│   ├── auth.ts             Better Auth mount (/api/auth/* via rewrite)
│   ├── health.ts           Smoke test (env presence)
│   ├── me.ts               Session + username
│   ├── sync.ts             Cloud save merge
│   ├── leaderboard.ts
│   ├── profile/[username].ts
│   ├── rolls/[id].ts
│   └── share/[id].ts       OG HTML for Discord crawlers
├── server/              🧠 Shared API logic
│   ├── auth.ts             betterAuth + Drizzle adapter
│   ├── db/                 Neon + schema
│   ├── sync.ts             Merge rules + roll upsert
│   ├── rateLimit.ts
│   ├── vercel-adapter.ts   (req, res) ↔ Fetch Request/Response
│   └── logger.ts
├── src/
│   ├── game/               Pure TS engine (rng, badges, EP, journey, share text)
│   ├── state/              GameProvider + localStorage
│   ├── lib/                Auth client, sync API, routes, logger
│   └── ui/                 Screens + components
├── docs/superpowers/    📚 Specs & plans
├── scripts/             🔧 check-db, signup smoke, TS7 API patch
├── public/              🖼️ Favicon / PWA icons
├── vercel.json          Rewrites (SPA + auth/share path helpers)
└── package.json         pnpm 10 · React 19 · TS 7 · Vite 6
```

| Area | Role | Stack |
| --- | --- | --- |
| **`src/game/`** | Pure game rules — testable without React | TypeScript |
| **`src/ui/` + `state/`** | SPA experience + persistence | React 19 · Tailwind v4 |
| **`api/` + `server/`** | Social backend on Vercel | Better Auth · Drizzle · Neon |
| **`docs/`** | Design specs and implementation plans | Markdown |

## 🗺️ Routes (SPA)

| Path | Screen |
| --- | --- |
| `/` | Roll (home) |
| `/history` | History |
| `/collection` | Badge collection |
| `/showcase` | Showcase |
| `/leaderboard` | Board |
| `/account` | Auth + cloud sync |
| `/about` | About |
| `/settings` | Settings |
| `/u/:username` | Public profile |
| `/r/:id` | Public roll (needs cloud copy for other devices) |

API (serverless): `/api/auth/*`, `/api/me`, `/api/sync`, `/api/leaderboard`, `/api/profile/:user`, `/api/rolls/:id`, `/api/share/:id`, `/api/health`.

## ☁️ Social / cloud setup

### 1. Neon
- Create a Postgres project (or use Vercel Neon integration).
- Put the **pooled** connection string in `DATABASE_URL` (local + Vercel Production).
- Run `pnpm db:push` once so tables exist: `user`, `session`, `account`, `verification`, `user_progress`, `rolls`, `rate_limits`.

### 2. Better Auth env
| Variable | Local example | Production |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled URL | **Same real Neon project** you intend to use live |
| `BETTER_AUTH_SECRET` | long random string | same or stronger |
| `BETTER_AUTH_URL` | `http://localhost:5173` | `https://rngdle-unlocked.chron0.tech` (**not** localhost) |
| `VITE_APP_URL` | same as above | production origin |

Generate a secret:

```bash
openssl rand -base64 32
```

### 3. Vercel
- Framework: Vite · build `pnpm run build` · output `dist`
- Set env for **Production** (and Preview if you use it)
- Redeploy after any env change

### 4. Share links
Public roll URLs only resolve for **rolls that were pushed to the cloud**. Flow:

1. Sign in → set username  
2. **Push / merge to cloud**  
3. Share from History / Home — Discord gets OG HTML via `/api/share/:id`, humans land on `/r/:id`

## 🧰 Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server (SPA) |
| `pnpm build` | Typecheck app + Vite production build → `dist/` |
| `pnpm typecheck` | App, node, and API tsconfigs |
| `pnpm preview` | Preview `dist/` |
| `pnpm test` | Unit tests (`vp test`) |
| `pnpm lint` | Lint via Vite+ |
| `pnpm db:push` | Push Drizzle schema to Neon |
| `pnpm db:studio` | Drizzle Studio |
| `npx vercel dev` | Local SPA + serverless APIs |

### Debug logging (browser)

Open DevTools console:

```js
__rngdleLog.setLevel('debug')
__rngdleLog.dump()
```

Server logs use the same `[rngdle:…]` prefixes in Vercel function logs.

## 🔐 Environment variables

See [`.env.example`](./.env.example). Never commit `.env` / `.env.local`.

| Name | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Social APIs | Neon; must match the project you inspect in the console |
| `BETTER_AUTH_SECRET` | Auth | Required in production |
| `BETTER_AUTH_URL` | Auth cookies / CSRF | Production site origin |
| `VITE_APP_URL` | Trusted origins | Usually same as `BETTER_AUTH_URL` |
| `LOG_LEVEL` | Server logs | Optional (`debug` / `info`) |

## 🏗️ Architecture notes

- **Game engine is pure TS** under `src/game/` — no React imports; covered by unit tests.
- **SPA routing** uses the History API (`src/lib/routes.ts`); Vercel rewrites non-`/api` paths to `index.html`.
- **Serverless handlers** use a small **Node `(req, res)` adapter** (`server/vercel-adapter.ts`) because Vercel’s Node runtime does not pass a Web `Request` by default. The adapter builds an absolute URL (required by Better Auth / better-call).
- **Auth multi-segment paths** (`/api/auth/sign-up/email`) are rewritten to `/api/auth?__path=…` and expanded in the adapter — Vite does not reliably support Next-style `[...all]` catch-alls.
- **TypeScript 7** is native; a postinstall shim re-points `require('typescript')` at `@typescript/typescript6` so Vercel’s classic API typecheck still works.
- **Merge-safe sync** never blindly overwrites: lifetime counters take max, collections union, histories merge by roll id.

## ❓ FAQ / troubleshooting

**Sign-up / APIs 404 or hang on Vercel**  
Confirm latest deploy, Production env vars (especially `BETTER_AUTH_URL` = real domain), and check Function logs. Hit `/api/health` — should return JSON with `ok: true`.

**`Invalid URL` / `headers.get is not a function` in logs**  
Those were fixed by the Node adapter + absolute URL construction. Redeploy if you still see them on an old build.

**Share link doesn’t show the roll**  
The roll must exist in Neon (`rolls` table). Sign in → Push to cloud, then share again. Local-only history only opens on the same browser.

**Leaderboard empty**  
Needs at least one user with a **username** and **cloud progress**. Sort/filter: all-time vs week.

**Wrong database**  
Compare `DATABASE_URL` host in Vercel with `.env.local`. A Neon project in another region is a different database.

**Session stuck on “Loading…”**  
The Account screen times out after a few seconds and shows the sign-in form. Check `/api/auth/get-session` in Network.

## 📌 Status & roadmap

| Area | Status |
| --- | --- |
| Solo unlimited playground | ✅ Shipped |
| Badges / EP / journey / share card | ✅ Shipped |
| Accounts + cloud sync | ✅ Shipped |
| Leaderboards + profiles | ✅ Shipped |
| OG share pages | ✅ Shipped |
| Server-authoritative rolls | 🔮 Future |
| OAuth providers | 🔮 Future |

Design docs:

- [Solo design](docs/superpowers/specs/2026-07-08-rngdle-unlocked-design.md)
- [Part 2 social design](docs/superpowers/specs/2026-07-09-mvp-part2-social-design.md)
- [Implementation plan](docs/superpowers/plans/2026-07-08-rngdle-unlocked.md)

---

<div align="center">

Made for fun · not affiliated with rngdle.com · [Play live](https://rngdle-unlocked.chron0.tech)

</div>
