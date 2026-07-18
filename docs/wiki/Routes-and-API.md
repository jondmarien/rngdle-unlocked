# Routes and API

## SPA tabs (History API)

| Path | Screen |
|------|--------|
| `/` | Roll (Free / Ranked / Daily / Weekly) |
| `/history` | Roll log + Highlights |
| `/history?view=highlights` | Deep link to History -> Highlights |
| `/collection` | Badge codex (unlock times, New 5-min tab) |
| `/stats` | Rarity histogram, EP/hour, calendar |
| `/leaderboard` | Ranked | Practice | All-Time | Arcade | Feed | Find |
| `/friends` | Friends |
| `/arcade` | Arcade Digits runs (shop, cash out / bust) |
| `/features` | Feature requests (sign-in) |
| `/whats-new` | Player-facing release highlights |
| `/notifications` | Alerts (Activity + System) |
| `/account` | Auth, username, profile look, push/pull |
| `/plus` | Ranked Plus checkout + products |
| `/about` | How to play, social, fairness |
| `/settings` | Theme, effects, tips, export/import |
| `/terms` | `/privacy` | `/payments` | Legal (incl. Polar MoR) |
| `/u/:username` | Public profile (+ follow) |
| `/s/:user/:code` | Vanity public roll (SPA) |
| `/r/:id` | Legacy public roll path |
| `/admin` | Operator-only (not in sitemap) |

## Notable APIs

`/api/auth/*`, `/api/me`, `/api/sync`, `/api/ranked-roll` (+ `/quota`), `/api/webhooks/polar`, `/api/leaderboard`, `/api/arcade` (+ start/roll/buy/arm/cash-out/abandon/leaderboard), `/api/feature-requests`, `/api/highlights`, `/api/follow`, `/api/feed`, `/api/users/search`, `/api/notifications`, `/api/system-messages`, `/api/admin/*`, `/api/reports`, `/api/challenge`, `/api/attest`, `/api/og`, `/api/page/:slug`, `/api/profile/:user`, `/api/u/:user`, `/api/rolls/:id`, `/api/share/:id`, `/api/discord/interactions`, `/api/health`.

Bot user-agents: `/s/:user/:code` -> share OG HTML; `/u/:username` -> profile OG; marketing/product tabs -> `/api/page/*` shells.

Full agent cheat sheet: [AGENTS.md §7](https://github.com/jondmarien/rngdle-unlocked/blob/main/AGENTS.md)
