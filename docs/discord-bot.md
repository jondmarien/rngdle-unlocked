# Discord bot (HTTP interactions)

RNGdle Unlocked Discord integration is a **Vercel serverless HTTP Interactions** app — no Gateway, no always-on host.

## Access model

| Action                          | Who                                                            |
| ------------------------------- | -------------------------------------------------------------- |
| **Play** (`/roll`, `/board`)    | Any player with Discord linked + public `@username` (free)     |
| **Add app to a Discord server** | Ranked Plus **Rare+** via gated OAuth (`/api/discord/install`) |

- **User install / DMs / personal use** — free play; no guild allowlist row.
- **Guild install** — Rare+ member starts install from `/plus` → Discord guild picker → we store `guild_id` in `discord_guild_installs`. Interactions authorized via guild install require that allowlist.

Do **not** share the raw Discord OAuth authorize URL publicly — use `/api/discord/install` so Rare+ is enforced.

Ops can mint a **bypass** guild-install URL for a specific free / non-admin user (24h, treat as secret):

```bash
node --env-file=.env.local scripts/mint-discord-guild-install.mjs --username=their_handle
```

## Status

| Gate       | Meaning                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| **Build**  | Code lives in `api/discord/*` + `server/discord/*`                           |
| **Play**   | Open to linked accounts (user-install).                                      |
| **Guilds** | Rare+ install path + allowlist. Dogfood with complimentary admin Anomaly OK. |

Ops check (Polar Rare+ rows):

```bash
node --env-file=.env.local scripts/check-polar-entitlements.mjs
```

Guild allowlist migration:

```bash
node --env-file=.env.local scripts/migrate-discord-guild-installs.mjs
```

## Env

| Variable                | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `DISCORD_PUBLIC_KEY`    | Interactions Ed25519 verify (Developer Portal → General) |
| `DISCORD_CLIENT_ID`     | Application id (existing OAuth app)                      |
| `DISCORD_CLIENT_SECRET` | Optional — register commands via client credentials      |
| `DISCORD_BOT_TOKEN`     | Optional — register commands via Bot token               |

Same Discord **Application** as Account OAuth.

Also register this **Redirect URI** on the Discord app (OAuth2):

`https://rngdle-unlocked.chron0.tech/api/discord/install/callback`

(and local `vercel dev` origin if you test installs locally).

## Setup

1. Developer Portal → Application → **Interactions Endpoint URL**:
   `https://rngdle-unlocked.chron0.tech/api/discord/interactions`
2. Copy **Public Key** → `DISCORD_PUBLIC_KEY` (Vercel + `.env.local`)
3. Enable **User Install** (Installation → User Install) so free players can add the app for themselves without a guild.
4. Register commands:

```bash
node --env-file=.env.local scripts/register-discord-commands.mjs
```

5. Run `migrate-discord-guild-installs.mjs` once.
6. Players: Account → **Link Discord** + `@username` → play. Rare+ → `/plus` → **Add to Discord server**.

## Commands

| Command  | Behavior                                                   |
| -------- | ---------------------------------------------------------- |
| `/roll`  | Components V2 roll screen — Free / Ranked / Daily / Weekly |
| `/board` | Paginated Ranked / Practice / All-Time leaderboard         |

### Trust model

| Mode           | `rolls.source` | Notes                                       |
| -------------- | -------------- | ------------------------------------------- |
| Free           | `discord`      | Honor-system; Practice/All-Time; not crowns |
| Ranked         | `ranked`       | Same server path + hour quota as web        |
| Daily / Weekly | `challenge`    | Deterministic period seed                   |

### Rate limits

- **30/min** interactions per Discord snowflake (burst)
- **8s** between successful rolls (channel pacing)
- Ranked still uses server **UTC hour** quota — Discord shows `remaining/limit left` like Home; at **0 left**, an **ephemeral** message (only the clicker) links to `/plus?topup=1` and Ranked Plus upgrade (Polar checkout stays on-site; no Discord payments).

## Privacy

The bot posts public roll/board messages in channels where `/roll` or `/board` is used. OAuth login still does not post on the user’s behalf without a command.
