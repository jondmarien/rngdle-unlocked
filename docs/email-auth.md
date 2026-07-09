# Email auth (Resend)

Outbound mail for **magic links** and **email verification** uses [Resend](https://resend.com) from the verified domain **`outreach.chron0.tech`**.

## Env (local + Vercel)

| Variable         | Example                                          |
| ---------------- | ------------------------------------------------ |
| `RESEND_API_KEY` | `re_…`                                           |
| `EMAIL_FROM`     | `RNGdle Unlocked <noreply@outreach.chron0.tech>` |

Add both to Vercel **Production** (and Preview if you test auth there).

## Behavior

1. **OAuth (Discord / GitHub)** — preferred for new users; provider verifies identity.
2. **Magic link** — Account → Or use email → Magic link. Creates or signs in; requires a real inbox.
3. **Email + password signup** — creates the user, sends a **verification** email; sign-in is blocked until verified (`requireEmailVerification`).
4. **Existing accounts** — run once after deploy:

```bash
node --env-file=.env.local scripts/grandfather-email-verified.mjs
```

This sets `email_verified = true` for everyone already in the DB so they are not locked out.

## Files

- `server/email.ts` — Resend wrapper
- `server/auth.ts` — `emailVerification` + `magicLink` plugin
- `src/lib/auth-client.ts` — `magicLinkClient()`
- `src/ui/screens/AccountScreen.tsx` — OAuth-first UI
