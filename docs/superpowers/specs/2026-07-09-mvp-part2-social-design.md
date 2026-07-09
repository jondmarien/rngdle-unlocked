# MVP Part 2 — Social (Vercel + Neon)

**Date:** 2026-07-09  
**Status:** In progress (2.1–2.2 foundation)  
**Deploy:** Vercel (static Vite SPA + serverless `/api`)  
**Database:** Neon Postgres (`bitter-grass-47308091` / `neondb`)

## Why Neon + Vercel

- Same platform as Part 1 deploy
- Neon Vercel integration for `DATABASE_URL`
- Serverless-friendly (`@neondatabase/serverless`)
- Keeps the pure TS game engine client-side; social is a sync/API layer

## Phases

| Phase                | Scope                                           | Status |
| -------------------- | ----------------------------------------------- | ------ |
| **2.1 Identity**     | Better Auth (email/password), session, username | Done   |
| **2.2 Cloud save**   | Push/pull progress + rolls                      | Done   |
| **2.3 Profiles**     | Public `/u/:username` + API                     | Done   |
| **2.4 Leaderboards** | All-time / weekly EP + badges                   | Done   |
| **2.5 Share links**  | `/r/:id` SPA + `/api/share/r/:id` OG HTML       | Done   |
| **2.6 Fairness**     | Soft rate limits + EP/number sanity on sync     | Done   |

## Architecture

```
Browser (Vite SPA)
  ├─ game engine (unchanged)
  ├─ localStorage (offline-first)
  └─ better-auth client + /api/sync
           │
           ▼
Vercel Serverless (/api/*)
  ├─ /api/auth/*     Better Auth handler
  ├─ /api/me         Session + profile
  └─ /api/sync       GET/POST cloud save
           │
           ▼
Neon Postgres
  ├─ user, session, account, verification  (auth)
  ├─ user_progress                         (cloud save)
  └─ rolls                                 (history + future leaderboards)
```

## Data model (app)

- **user_progress** — one row per user: lifetime EP/rolls, journey EP, collection JSON, stats JSON
- **rolls** — individual rolls (capped sync of recent history for leaderboards)
- Merge policy on sync:
  - Collection: union by badge id (earliest firstEarnedAt wins)
  - Lifetime counters: **max**(local, cloud)
  - History: merge by roll id, keep newest 500
  - Stats: max streaks, best roll by EP

## Auth

- Provider: **Better Auth** + Drizzle + Neon
- Methods (v1 of social): email + password
- Later: Discord/GitHub OAuth via Better Auth social plugins
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL` on Vercel

## Non-goals (Part 2.1–2.2)

- Daily lock
- Server-authoritative RNG (rolls still client-side for now)
- Full Next.js rewrite

## Local setup

1. Copy `.env.example` → `.env.local`
2. Set `DATABASE_URL` (Neon)
3. `pnpm db:push`
4. `pnpm dev` + API via `vercel dev` or separate note

## Deploy checklist

1. Vercel project ↔ Neon integration (`DATABASE_URL`)
2. Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://<prod-domain>`
3. Ensure `/api/*` not rewritten to `index.html`
