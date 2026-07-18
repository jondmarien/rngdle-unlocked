# Discord bot (HTTP interactions)

RNGdle Unlocked Discord integration is a **Vercel serverless HTTP Interactions** app — no Gateway, no always-on host.

## Status

| Gate              | Meaning                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Build**         | Code lives in `api/discord/interactions.ts` + `server/discord/*`                                                                  |
| **Public invite** | Only after a **non-admin** Rare+ row exists in `user_entitlements` (Polar webhook). Admins can dogfood via complimentary Anomaly. |

Ops check:

```bash
node --env-file=.env.local scripts/check-polar-entitlements.mjs
```

## Env

| Variable                | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `DISCORD_PUBLIC_KEY`    | Interactions Ed25519 verify (Developer Portal → General) |
| `DISCORD_CLIENT_ID`     | Application id (existing OAuth app)                      |
| `DISCORD_CLIENT_SECRET` | Optional — register commands via client credentials      |
| `DISCORD_BOT_TOKEN`     | Optional — register commands via Bot token               |

Same Discord **Application** as Account OAuth. Enable a Bot user only if you prefer Bot-token command registration; guild invite can stay **`applications.commands` only**.

## Setup

1. Developer Portal → Application → **Interactions Endpoint URL**:
   `https://rngdle-unlocked.chron0.tech/api/discord/interactions`
2. Copy **Public Key** → `DISCORD_PUBLIC_KEY` (Vercel + `.env.local`)
3. Register commands:

```bash
node --env-file=.env.local scripts/register-discord-commands.mjs
```

4. Invite (commands only — no `bot` scope):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_APP_ID&scope=applications.commands
```

5. Players: Account → **Link Discord** + `@username` + Ranked Plus **Rare+** (`/plus`).

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
- Ranked still uses server **UTC hour** quota

## Privacy

The bot posts public roll/board messages in channels where `/roll` or `/board` is used. OAuth login still does not post on the user’s behalf without a command.
