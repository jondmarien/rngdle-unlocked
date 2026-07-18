# Game Modes and Trust

| Mode | RNG | Where it places | Crowns |
|------|-----|-----------------|--------|
| **Free play** | Browser CSPRNG | Practice + All-Time (via sync) | No |
| **Ranked** | Server CSPRNG (`POST /api/ranked-roll`) | Ranked + All-Time | Yes |
| **Daily / Weekly** | Deterministic seed + subject id | Practice + All-Time | No |
| **Arcade** | Server CSPRNG run loop | Arcade (best Digits) | No (Digits != EP) |

## Trust rules

- Free play is honor-system for Practice - never claim "proof of honest client RNG."
- Ranked requires signed-in user + public `@username`. Client sync must never write `rolls.source = 'ranked'`.
- Discord Free rolls use `source=discord` (Practice/All-Time, not crowns). Ranked Discord uses the real ranked path.
- Absolute Ceiling `1_000_000` has uniform chance in range plus an independent 1-in-100M jackpot (client Free + server Ranked).

Deep diagrams: [[Architecture]]
