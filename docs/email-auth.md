# Email auth

Email + password is available as a fallback to **Discord / GitHub OAuth**.

Magic-link sign-in and signup email verification are **disabled** (Resend delivery was unreliable, and unverified local users blocked Discord OAuth with `account_not_linked`).

## Behavior

1. **OAuth (Discord / GitHub)** — preferred for new users; provider verifies identity.
2. **Email + password** — any email address works; no inbox verification gate. Sign up, then sign in immediately.
3. **Account deletion** — still sends a confirmation email via Resend when configured (`RESEND_API_KEY` / `EMAIL_FROM`).

## Env (local + Vercel) — optional, deletion only

| Variable         | Example                                          |
| ---------------- | ------------------------------------------------ |
| `RESEND_API_KEY` | `re_…`                                           |
| `EMAIL_FROM`     | `RNGdle Unlocked <noreply@outreach.chron0.tech>` |

## Files

- `server/email.ts` — Resend wrapper (account deletion)
- `server/auth.ts` — email + password (`requireEmailVerification: false`), OAuth account linking (`requireLocalEmailVerified: false`)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/ui/screens/AccountScreen.tsx` — OAuth-first UI + email/password

## Discord + leftover unverified emails

If someone previously tried magic link / verification signup, Better Auth may have created a local user with `email_verified = false`. Discord sign-in with the same address then failed with `account_not_linked` because linking required a verified local email.

Mitigations in `server/auth.ts`:

- `account.accountLinking.requireLocalEmailVerified: false`
- `databaseHooks.user.create` sets `emailVerified: true` for new users

Optional one-shot for existing rows:

```bash
node --env-file=.env.local scripts/grandfather-email-verified.mjs
```
