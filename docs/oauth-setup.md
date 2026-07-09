# Discord + GitHub OAuth setup

Step-by-step guide to enable **Continue with Discord** and **Continue with GitHub** on the Account screen (Better Auth).

You can complete this **before** the OAuth code ships: create the apps, upload the icon, and paste Client ID/Secret into local + Vercel env. Sign-in buttons will work after the next deploy that wires `socialProviders`.

**Live origin:** `https://rngdle-unlocked.chron0.tech`  
**Auth base path:** `/api/auth`  
**Callbacks:** `/api/auth/callback/discord` · `/api/auth/callback/github`  
**Legal (paste into Discord / GitHub app settings):**

| Field            | URL                                           |
| ---------------- | --------------------------------------------- |
| Terms of Service | `https://rngdle-unlocked.chron0.tech/terms`   |
| Privacy Policy   | `https://rngdle-unlocked.chron0.tech/privacy` |
| Homepage         | `https://rngdle-unlocked.chron0.tech`         |

**Brand icon for portals:** [`public/brand/oauth-icon-512.png`](../public/brand/oauth-icon-512.png) (512×512 PNG from the site favicon).

---

## What you need

| Provider    | What to create                                              | Bot required?                                     |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------- |
| **Discord** | Discord **Application** with OAuth2 redirects               | **No** — a bot is optional and not used for login |
| **GitHub**  | **OAuth App** (simplest) or GitHub App with Email Read-only | N/A                                               |

Env vars (server only — never `VITE_`-prefix secrets):

```bash
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Also ensure these already match production:

```bash
BETTER_AUTH_URL=https://rngdle-unlocked.chron0.tech
VITE_APP_URL=https://rngdle-unlocked.chron0.tech
BETTER_AUTH_SECRET=…   # existing
DATABASE_URL=…          # existing
```

---

## 1. Discord Application

1. Open [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it e.g. `RNGdle Unlocked`.
2. **App Icon:** upload [`public/brand/oauth-icon-512.png`](../public/brand/oauth-icon-512.png).
3. **General Information** (or the app’s legal / links fields): set

   | Field                | URL                                           |
   | -------------------- | --------------------------------------------- |
   | Terms of Service URL | `https://rngdle-unlocked.chron0.tech/terms`   |
   | Privacy Policy URL   | `https://rngdle-unlocked.chron0.tech/privacy` |

4. Left nav → **OAuth2**.
5. **Client information:** copy **Client ID** and **Client Secret** (Reset Secret if needed).
6. **Redirects** → Add Redirect → save **both** (or the ones you use):

   | Environment                                 | Redirect URL                                                       |
   | ------------------------------------------- | ------------------------------------------------------------------ |
   | Production                                  | `https://rngdle-unlocked.chron0.tech/api/auth/callback/discord`    |
   | Local (`npx vercel dev`, default port 3000) | `http://localhost:3000/api/auth/callback/discord`                  |
   | Optional Vite-only proxy setups             | Prefer `vercel dev` so `/api/auth` hits the same origin as cookies |

7. Scopes used by Better Auth for sign-in are typically `identify` + `email`. You do **not** need the `bot` scope for Account login.
8. Paste into `.env.local` / `.env` and **Vercel → Project → Settings → Environment Variables** (Production + Preview):

   ```bash
   DISCORD_CLIENT_ID=…
   DISCORD_CLIENT_SECRET=…
   ```

9. Redeploy after saving Vercel env (env changes do not apply to an already-running deployment).

### Discord notes

- Phone-only Discord accounts can return `email: null`. Better Auth may need a `mapProfileToUser` fallback in code; if you hit that, open an issue / tell the agent.
- Do **not** put the Client Secret in any `VITE_*` variable.

---

## 2. GitHub OAuth App

1. GitHub → profile menu → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Fill in:

   | Field                      | Value                                                          |
   | -------------------------- | -------------------------------------------------------------- |
   | Application name           | `RNGdle Unlocked`                                              |
   | Homepage URL               | `https://rngdle-unlocked.chron0.tech`                          |
   | Application description    | (optional) Unlimited random-number game — badges, EP, Ranked   |
   | Authorization callback URL | `https://rngdle-unlocked.chron0.tech/api/auth/callback/github` |

   After create, if GitHub shows Terms / Privacy fields on the OAuth App, use:

   | Field                | URL                                           |
   | -------------------- | --------------------------------------------- |
   | Terms of service URL | `https://rngdle-unlocked.chron0.tech/terms`   |
   | Privacy policy URL   | `https://rngdle-unlocked.chron0.tech/privacy` |

3. After create: **Upload logo** → use [`public/brand/oauth-icon-512.png`](../public/brand/oauth-icon-512.png).
4. Copy **Client ID**. Generate a **Client secret** and copy it once.
5. For **local** testing, either:
   - Add a second OAuth App with Homepage `http://localhost:3000` and callback `http://localhost:3000/api/auth/callback/github`, **or**
   - Temporarily change the single app’s callback while developing (awkward for prod) — **prefer a separate “RNGdle Unlocked (local)” OAuth App**.

6. Paste into env (use the **production** app’s credentials on Vercel Production):

   ```bash
   GITHUB_CLIENT_ID=…
   GITHUB_CLIENT_SECRET=…
   ```

### GitHub App instead of OAuth App?

If you create a **GitHub App** (not OAuth App): under **Permissions → Account permissions → Email addresses** set **Read-only**, or you will get `email_not_found` when the user’s email is private.

For a classic **OAuth App**, request the `user:email` scope (Better Auth does this for GitHub). Users with fully private emails still need `/user/emails` access via that scope.

---

## 3. Local env checklist

In `.env.local` (and optionally `.env` for scripts):

```bash
# Existing
DATABASE_URL=…
BETTER_AUTH_SECRET=…
BETTER_AUTH_URL=http://localhost:3000
# or http://localhost:5173 if you only run Vite — prefer vercel dev for OAuth cookies
VITE_APP_URL=http://localhost:3000

# New
DISCORD_CLIENT_ID=…
DISCORD_CLIENT_SECRET=…
GITHUB_CLIENT_ID=…
GITHUB_CLIENT_SECRET=…

# Admin bootstrap (already set) — not used for OAuth
ADMIN_SECRET=…
```

Run full stack locally:

```bash
npx vercel dev
```

Open the printed URL (usually `http://localhost:3000`) → **Account** → Continue with Discord / GitHub.

---

## 4. Account linking (product behavior)

- Linking is **enabled** for trusted providers (`discord`, `github`).
- `allowDifferentEmails: true` — Discord/GitHub emails often differ from the account email; without this, link redirects back to `/account` with `error=email_doesn't_match`.
- If someone already has email/password and later signs in with Discord/GitHub using the **same verified email**, Better Auth should attach the social account to that user instead of creating a duplicate.
- Signed-in users can also **Link Discord / Link GitHub** from Account (after UI ships).
- **Ranked** still requires a public `@username` after OAuth — set it on Account before Ranked Generate.

---

## 5. Verify after OAuth code is deployed

1. Production: Account → **Continue with Discord** → approve → land on `/account` signed in.
2. Repeat with GitHub (incognito or another browser if needed).
3. Existing email/password user: sign in with password, then **Link** Discord; sign out; Continue with Discord → same account.
4. Hit `/api/health` if anything 500s; check Vercel function logs for `/api/auth/callback/*`.
5. Confirm Client secrets are **only** in server env (Vercel + local), never in the client bundle.
6. After first successful OAuth or email login, promote yourself once:

```bash
CONFIRM_PROMOTE=yes node scripts/promote-admin.mjs --email you@example.com
```

Then sign out/in and open `/admin` (or Account → Admin panel).

---

## 6. Common failures

| Symptom                                  | Likely cause                                                          | Fix                                                            |
| ---------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `redirect_uri` mismatch                  | Callback URL not exact (http vs https, port, trailing slash)          | Match portal redirects to table above                          |
| Works locally, fails on prod             | Vercel missing env or `BETTER_AUTH_URL` still localhost               | Set Production env; redeploy                                   |
| GitHub `email_not_found`                 | Private email / GitHub App missing Email Read-only                    | OAuth App + `user:email`, or fix GitHub App permission         |
| Cookies / session missing after redirect | Mixed origins (SPA on 5173, API on 3000) without proxy                | Use `npx vercel dev` single origin                             |
| Discord null email                       | Phone-only Discord account                                            | Need code fallback; contact maintainer                         |
| Buttons missing in UI                    | OAuth code not deployed yet, or env empty so providers not registered | Finish this guide; wait for deploy that adds `socialProviders` |

---

## 7. Security reminders

- Never commit `.env` / `.env.local` or Client Secrets.
- Rotate a secret in the provider portal if it leaks; update Vercel + local immediately.
- `ADMIN_SECRET` is **bootstrap / break-glass only** for promoting an admin user — not for Discord/GitHub.
- Day-to-day admin uses **session + `user.role === admin`**, not shared header secrets.

---

## Quick copy — production redirects

```
https://rngdle-unlocked.chron0.tech/api/auth/callback/discord
https://rngdle-unlocked.chron0.tech/api/auth/callback/github
```

## Quick copy — local redirects (`vercel dev`)

```
http://localhost:3000/api/auth/callback/discord
http://localhost:3000/api/auth/callback/github
```
