# Environment Variables

See [`.env.example`](https://github.com/jondmarien/rngdle-unlocked/blob/main/.env.example) for the authoritative list.

| Variable                        | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`                  | Neon Postgres                                  |
| `BETTER_AUTH_SECRET`            | Auth + HMAC                                    |
| `BETTER_AUTH_URL`               | Site origin                                    |
| `VITE_APP_URL`                  | Client trusted origin                          |
| `RESEND_API_KEY` / `EMAIL_FROM` | Account deletion confirmation email (optional) |
| `DISCORD_CLIENT_ID` / `SECRET`  | OAuth                                          |
| `DISCORD_PUBLIC_KEY`            | Interactions bot verify                        |
| `GITHUB_CLIENT_ID` / `SECRET`   | OAuth                                          |
| Polar keys                      | Ranked Plus checkout / webhooks                |
| `ADMIN_USER_IDS`                | Optional admin bootstrap                       |

Never commit `.env` / `.env.local`.
