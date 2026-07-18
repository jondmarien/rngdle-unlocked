# Development Setup

## Play only (no backend)

```bash
corepack enable
corepack prepare pnpm@10.34.4 --activate
pnpm install
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Rolls and badges work with no env vars.

## Full stack (auth + leaderboard + sync)

1. Copy env: `cp .env.example .env.local` — see [[Environment]]
2. Apply schema to Neon:

```bash
pnpm db:push
# Prefer additive scripts if drizzle asks to truncate rolls:
node scripts/migrate-feature-wave.mjs
node --env-file=.env.local scripts/migrate-arcade.mjs
node --env-file=.env.local scripts/migrate-polar-entitlements.mjs
node --env-file=.env.local scripts/migrate-profile-frame.mjs
```

3. Run SPA + APIs: `npx vercel dev` (recommended for local social)

4. Production: deploy to Vercel, set the same env for **Production**, attach Neon, redeploy.

Live: https://rngdle-unlocked.chron0.tech

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Vite SPA |
| `pnpm build` | Typecheck + Vite → `dist/` |
| `pnpm typecheck` | App + node + server (NodeNext) |
| `pnpm test` | Unit tests |
| `pnpm lint` / `pnpm fmt` | Lint / Oxfmt |
| `npx vercel dev` | SPA + `/api/*` |
| `pnpm db:push` | Drizzle schema push |
| `pnpm wiki:publish` | Push [`docs/wiki/`](https://github.com/jondmarien/rngdle-unlocked/tree/main/docs/wiki) → GitHub Wiki |

## Social / cloud checklist

1. **Neon** — pooled `DATABASE_URL` (local + Vercel Production)
2. **Better Auth** — `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (prod = real domain), `VITE_APP_URL`
3. **Vercel** — Framework Vite, output `dist`, env on Production
4. **Share links** — vanity URLs only for rolls that exist in Neon (sign in → sync → Share)

Optional integrations: [[OAuth]], [[Email-Auth]], [[Discord-Bot]], [[Polar-Monetization]].
