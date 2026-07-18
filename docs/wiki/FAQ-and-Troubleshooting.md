# FAQ and Troubleshooting

**Sign-up / APIs 404 or hang on Vercel**  
Confirm latest deploy, Production env vars (especially `BETTER_AUTH_URL` = real domain), and Function logs. Hit `/api/health` — should return JSON with `ok: true`.

**Share link stuck on “Waiting for cloud…”**  
The roll must exist in Neon. Sign in so auto-sync runs, or Account → Push, then share again. Logged-out users never get a public URL (by design).

**Follow / feed fails**  
Need `follows` table — run `node scripts/migrate-feature-wave.mjs` on that database. Sign in required.

**Leaderboard empty / “you” missing**  
Needs a **username**. **Ranked**: generate via Roll → Ranked. **Practice**: public Free / challenge rolls. **All-Time**: synced lifetime. **Arcade**: complete a Digits run on `/arcade`.

**Arcade start rejected / “run in progress”**  
One active run per user — Continue, Cash out, or two-step Abandon from the Arcade tab.

**Ranked roll 500 / “Ranked roll failed”**  
Needs signed-in session + `@username`. Check `/api/ranked-roll` logs. Schema needs `rolls.source` (`scripts/add-roll-source.mjs`). Extensionless `src/game` imports break production — `pnpm typecheck` (NodeNext) should fail before deploy.

**Arcade 500 / missing tables**  
Run `node --env-file=.env.local scripts/migrate-arcade.mjs` against the same Neon `DATABASE_URL` as production.

**Wrong database**  
Compare `DATABASE_URL` host in Vercel with `.env.local`.

**Session stuck on “Loading…”**  
Account screen times out and shows sign-in. Check `/api/auth/get-session` in Network.

**Reel stuck on `?????` after Daily/Weekly**  
Mode-switch reveal race — remount reel (see [AGENTS.md §5.6](https://github.com/jondmarien/rngdle-unlocked/blob/main/AGENTS.md)).

**Discord `/board` showed 0 EP**  
Fixed in v0.19.2 (`lifetimeEP` field names).

## Quick diagnosis table

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Ranked missing `rarity` module | Extensionless import in `src/game` | Add `.js` extensions; `pnpm typecheck` |
| Ranked 500 after auth | Missing `rolls.source` | `scripts/add-roll-source.mjs` |
| Free sync 429 hourly | Old hourly cap | Removed — soft per-minute burst only |
| Feed only one user / rare only | Old filters | Feed includes self; all rarities |
| Admin Users missing `@` | `user.username` null | Admin Edit or backfill script |

Manual smoke after roll UI changes: Free → Daily → Free → Ranked (signed in).

More: [AGENTS.md §11](https://github.com/jondmarien/rngdle-unlocked/blob/main/AGENTS.md)
