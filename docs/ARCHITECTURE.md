# Architecture

RNGdle Unlocked is a **client-first** number game with an **optional** cloud social layer and a **server-issued Ranked** free-play path for fair competition.

## High-level

```mermaid
flowchart TB
  subgraph Browser
    UI[React SPA]
    Engine[src/game pure TS]
    LS[(localStorage)]
    UI --> Engine
    UI --> LS
  end

  subgraph Vercel
    Static[dist/ static]
    API["/api/* serverless"]
    Ranked["POST /api/ranked-roll"]
  end

  subgraph Neon
    DB[(Postgres · rolls.source)]
  end

  Static --> UI
  UI -->|auth · sync · Practice board| API
  UI -->|Ranked Generate| Ranked
  Ranked --> DB
  API --> DB
```

## Roll modes

| Mode | RNG | Persist | Competitive surfaces |
| --- | --- | --- | --- |
| **Free play** | Browser CSPRNG | localStorage → sync as `source=client` | **Leaderboard → Practice** only |
| **Ranked** | Server CSPRNG | Neon `source=ranked` first; client merges history | **Leaderboard → Ranked**, community crowns, overtakes |
| **Daily / Weekly** | Deterministic seed | sync as `source=challenge` | Optional challenge; not Ranked crowns |

Mode switch fully resets the home reel / session roll (and abandons in-flight Generate).

## Free play lifecycle

```mermaid
sequenceDiagram
  participant U as User
  participant H as HomeScreen
  participant G as GameProvider
  participant E as game/engine
  participant S as localStorage
  participant C as /api/sync

  U->>H: Generate Free play
  H->>H: Scramble reel · ??? EP
  H->>G: roll() free
  G->>E: client CSPRNG + evaluate
  E-->>G: number · badges · EP · rarity
  G->>S: history + collection + stats
  G-->>H: lastRoll source=client
  H->>H: Lock · cascade · count EP
  opt signed in
    G->>C: auto-sync merge source=client
    C-->>G: merged cloud
    Note over C: unlock notifs only — no Ranked crowns
  end
```

## Ranked free play lifecycle

```mermaid
sequenceDiagram
  participant U as User
  participant H as HomeScreen
  participant G as GameProvider
  participant R as /api/ranked-roll
  participant DB as Neon
  participant A as rollActivity

  U->>H: Generate Ranked
  H->>G: roll() ranked
  G->>R: POST credentials
  R->>R: auth + username + rate limit
  R->>R: server CSPRNG + evaluateBadges
  R->>DB: insert rolls source=ranked
  R->>A: crowns / overtake if #1
  R-->>G: RollResult
  G->>G: local history + collection merge
  G-->>H: lastRoll source=ranked
  Note over DB: Leaderboard Ranked + highlights query source=ranked
```

## Leaderboards

```mermaid
flowchart LR
  Free[Free play sync] --> Practice[Leaderboard Practice]
  Ranked[Ranked API rolls] --> RankedBoard[Leaderboard Ranked]
  Ranked --> Crowns[Community crowns + overtakes]
  Free -.->|does not| Crowns
```

- **Practice all-time** — `user_progress` lifetime EP / rolls / badge counts (synced free play).
- **Practice week** — public rolls with `source != ranked`.
- **Ranked all-time / week** — sum of public `source=ranked` rolls only.
- Client sync **cannot** set `source=ranked` (server preserves ranked on conflict).

## Badge unlock & notifications

```mermaid
flowchart LR
  Roll[Roll badges] --> Merge[mergeCollection + firstEarnedAt]
  Merge --> Local[Codex · NEW filter · NEW ribbon]
  Merge --> Sync[POST /api/sync]
  Sync --> Diff{new badge ids?}
  Diff -->|yes| Act[Activity inbox]
  Diff -->|secret mastery| Sec[secret_mastery notif]
  RankedIns[Ranked insert] --> Crown{ranked #1 today/week/alltime?}
  Crown -->|yes| Sys[System crown broadcast]
  Crown -->|overtook other| Over[Activity overtaken]
```

## Share & OG

```mermaid
flowchart TB
  Roll[Synced public roll] --> Share[Share panel]
  Share -->|waitForCloudPublish| API["GET /api/rolls/:key"]
  API --> Vanity["/s/:user/:code"]
  Vanity -->|human| SPA[SPA PublicRoll]
  Vanity -->|bot UA| HTML["/api/share · OG HTML"]
  HTML --> Img["/api/og SVG"]
  Profile["/u/:user"] -->|bot UA| UHTML["/api/u · profile OG"]
  UHTML --> Img
```

## Key directories

| Path | Responsibility |
| --- | --- |
| `src/game/` | Pure rules: RNG, badges, rarity, secrets, challenges, share text |
| `src/state/` | Persistence, Free / Ranked / challenge orchestration, auto-sync |
| `src/ui/` | Screens & motion (reel, cascade, codex, dual boards) |
| `api/` | Vercel route entrypoints (`ranked-roll`, `leaderboard`, …) |
| `server/` | Auth, DB, merge, ranked issue, rate limits, roll activity, OG HTML |
| `public/` | Icons, avatars, secret art, Absolute Ceiling badge, PWA |

## Trust model (honest)

| Claim | Reality |
| --- | --- |
| Free-play randomness | Browser CSPRNG + entropy pool — **client-authoritative**; Practice board honor system |
| Ranked free-play randomness | **Server CSPRNG** via `/api/ranked-roll`; scores server-side; `source=ranked` |
| Challenge numbers | Deterministic from period seed + subject id |
| Attestation seal | Server HMAC on a **claim** — not proof of honest client RNG |
| Leaderboard Ranked | Fair competition baseline (server-issued only) |
| Leaderboard Practice | Who **synced** free-play progress with a username |
| Community crowns | Ranked rolls only |
| Share links | Only after roll row exists in Neon |

## Related docs

- [Solo design](./superpowers/specs/2026-07-08-rngdle-unlocked-design.md)
- [Social design](./superpowers/specs/2026-07-09-mvp-part2-social-design.md)
- [Feature wave plan](./superpowers/plans/2026-07-09-feature-wave.md)
