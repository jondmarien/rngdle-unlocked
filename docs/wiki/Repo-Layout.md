# Repo Layout

```
api/ Vercel serverless entrypoints (thin -> server/*)
server/ Shared backend: auth, sync, ranked, arcade, leaderboard, discord, polar
src/game/ Pure TS engine (RNG, badges, rarity, arcade) - no React
src/state/ GameProvider, useSync, localStorage
src/ui/ Screens + reel components
src/lib/ Auth client, routes, *-api.ts wrappers, seo-copy, schemas
public/ Static assets, robots.txt, sitemap.xml, fonts
docs/ Architecture + integration guides
docs/wiki/ Staging for this GitHub Wiki (publish with pnpm wiki:publish)
scripts/ Migrations, wiki publish, Discord register, etc.
```

| Path | Rule |
|------|------|
| `src/game/` | Pure, testable; `.js` extensions on relative imports used by server |
| `src/lib/*-api.ts` | UI must not `fetch('/api/...')` directly |
| `api/*` | Thin handlers -> `server/*` via `apiGuards` |
| `server/db/schema.ts` | Table source of truth |

Agent contract (in-repo, not mirrored here): [`AGENTS.md`](https://github.com/jondmarien/rngdle-unlocked/blob/main/AGENTS.md)
