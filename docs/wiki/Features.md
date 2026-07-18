# Features

Product surface overview. Trust / board placement details live in [[Game-Modes-and-Trust]].

## Solo playground

- **Unlimited rolls** 0-1,000,000 (no daily lock)
- **Fortified CSPRNG** - `crypto.getRandomValues`, entropy mixing, reject sampling (not `Math.random`)
- **Reel animation** - digits scramble then lock with rarity glow; badge cascade; EP count-up
- **Fresh reel on refresh** - Home does not restore the last roll; History / Codex keep progress
- **Roll mode picker** - Free | Ranked | Daily | Weekly with plain-language board placement copy
- **325+ number badges** + Journey / Lifetime EP seals + secret masteries (Bases, Radix Crown, Atomic Seal, streak secrets, Codex Absolute, ...)
- **Badge codex** - spoiler-safe locked entries, unlock timestamps, **New** tab (first unlocks in the last 5 minutes), spoiler-safe search
- **EP + rarity ladder** (trash -> divine) with percentile framing
- **History + Highlights** - searchable roll log; streaks / best consecutive
- **Stats** - rarity histogram, EP/hour, 28-day streak calendar
- **Export / import** save files; theme light / dark / system; optional confetti / SFX / motion
- **Share** - Discord-style text + PNG card (vanity URLs need cloud - see Social)

## Roll modes

| Mode | Number source | Leaderboard / crowns |
| ---- | ------------- | -------------------- |
| **Free play** | Browser CSPRNG | Practice + All-Time via sync. No crowns. |
| **Ranked** | Server CSPRNG (`POST /api/ranked-roll`) | Ranked board + today/week/all-time crowns. Needs `@username`. |
| **Daily / Weekly** | Deterministic period seed + subject id | Challenge flavor; Practice + All-Time. No Ranked crowns. |
| **Arcade** | Server CSPRNG inside Digits run loop | Arcade board (best Digits). Separate tab `/arcade` - Digits != EP. |

Absolute Ceiling jackpot (1 in 100M) exists on Free and Ranked. See [[Game-Modes-and-Trust]].

## Social & competitive (optional)

- **Auth** - email + password, magic link (Resend), Discord / GitHub OAuth - [[Email-Auth]], [[OAuth]]
- **Public `@username`**, profiles (accent, flair, bio, avatars, Ranked Plus frames)
- **Auto cloud sync** on Free / challenges when signed in (merge-safe; cannot forge `source=ranked`)
- **EP boards** - Ranked | Practice | All-Time; Total EP or Best Roll (by EP / rarity)
- **Arcade Mode** - `/arcade` Digits runs; **Leaderboard -> Arcade** ranks best Digits (never EP)
- **Board tabs** - Ranked | Practice | All-Time | Arcade | Feed | Find
- **Features tab** - community requests, upvotes, Active / Shipped / Declined
- **Community highlights** - today's + weekly best **Ranked** rolls on Home when idle
- **Follows + Feed** - all public rarities; All / Ranked / Free play toggles
- **Alerts** - Activity (follows, unlocks, overtaken) + System (broadcasts + Ranked crowns); same-roll crown periods grouped
- **Vanity share** - `/s/:username/:shortCode` only after cloud confirm; dynamic OG PNGs
- **Prove this roll** - optional HMAC seal (`/api/attest`) for claims (not Free-play RNG honesty)
- **Ranked Plus (`/plus`)** - Polar subscriptions, Boost/Overload top-ups, Plus regen - [[Polar-Monetization]], [[Ranked-Plus-Checkout]]
- **Legal** - `/terms`, `/privacy`, `/payments` (Polar MoR disclosure)

## Discord

HTTP Interactions bot: `/roll` and `/board`. Play Free is available when Discord is linked + `@username`; Rare+ is for **adding the app to a guild**. See [[Discord-Bot]].

## Planned later

- Turnstile on sign-up
- Server-side EP velocity caps

Live player notes: https://rngdle-unlocked.chron0.tech/whats-new
