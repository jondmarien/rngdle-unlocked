# Feature wave — social / retention / share / competitive

**Date:** 2026-07-09  
**Status:** Implementing  
**Scope:** Features 1, 2, 4, 5, 6, 7, 8, 10, 11, 12 + share UX gates  
**Later:** 3 OAuth, 9 notifications, 13 Turnstile, 14 EP velocity cap, 15 admin

## In scope

| #   | Feature                                               | Phase |
| --- | ----------------------------------------------------- | ----- |
| 1   | “You on the board” — highlight own rank after sync    | B     |
| 2   | Friends / following — follow @user, rare-roll feed    | C     |
| 4   | Server roll attestation — optional “prove this roll”  | D     |
| 5   | Weekly/daily challenge seed — optional mode           | D     |
| 6   | Onboarding tooltip — first roll + account CTA         | B     |
| 7   | Badge encyclopedia — locked vs unlocked, spoiler-safe | B     |
| 8   | Stats page — histogram, EP/hour, streak calendar      | B     |
| 10  | Auto-open share on mythic+                            | A     |
| 11  | Dynamic OG image for Discord                          | D     |
| 12  | Share link only after cloud 200                       | A     |
| —   | Logged-out share: no public link, account CTA         | A     |
| —   | “Waiting for cloud…” share panel                      | A     |

## Out of scope (later)

- 3 Discord/GitHub OAuth (Better Auth plugins)
- 9 “You got overtaken” notifications — ✅ shipped (day/week/all-time)
- 13 Turnstile on sign-up
- 14 Per-user EP velocity cap server-side
- 15 Admin wipe / abusive username report

## Phase order

### A — Share gates (done first)

- `waitForCloudPublish` after auto-sync; poll `/api/rolls/:key`
- SharePanel states: `logged-out` | `checking` | `ready` | `error`
- No public URL until `ready`; copy text without link otherwise
- Mythic/anomaly auto-open share on reveal
- `onGoAccount` → Account tab

### B — Board / product

- Leaderboard: highlight self row + `me` rank payload
- Onboarding banner after first roll if logged out
- Stats tab: rarity histogram, EP/hour, streak calendar
- Codex (Collection): spoiler-safe locked copy + family filter

### C — Social graph

- Schema: `follows(follower_id, following_id)`
- API: follow / unfollow / following list / activity feed
- Profile Follow button; Board “Feed” subview

### D — Competitive + virality

- `GET /api/challenge` — daily + weekly seeds
- Optional challenge roll (seed + userId → verifiable number)
- `POST /api/attest` — HMAC seal on owned roll
- `GET /api/og` — dynamic SVG/PNG card; wire into share HTML meta

## Design notes

- **Challenge:** free unlimited play unchanged; challenge is opt-in. Personal daily/weekly number = `map(sha256(periodSeed + '|' + userId))` so shared period seed is public and each account is verifiable.
- **Attestation:** optional seal; does not make client RNG server-authoritative.
- **OG:** prefer image URL in `og:image` (not only HTML description).
- **Follow feed:** rare+ public rolls from followed users (last 7d).

## Deploy notes

- Run `pnpm db:push` after schema changes (follows, attestation columns).
- No new env required for challenge seeds; attestation uses `BETTER_AUTH_SECRET` as HMAC key.
