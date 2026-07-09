# Architecture

RNGdle Unlocked is a **client-first** number game with an **optional** cloud social layer.

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
  end

  subgraph Neon
    DB[(Postgres)]
  end

  Static --> UI
  UI -->|auth · sync · social| API
  API --> DB
```

## Roll lifecycle (free play)

```mermaid
sequenceDiagram
  participant U as User
  participant H as HomeScreen
  participant G as GameProvider
  participant E as game/engine
  participant S as localStorage
  participant C as /api/sync

  U->>H: Generate
  H->>H: Scramble reel · ??? EP
  H->>G: roll()
  G->>E: CSPRNG + evaluate
  E-->>G: number · badges · EP · rarity
  G->>S: history + collection + stats
  G-->>H: lastRoll + lastNewBadgeIds
  H->>H: Lock number · cascade badges · count EP
  opt signed in
    G->>C: auto-sync merge
    C-->>G: merged cloud
    Note over C: unlock notifs · community crown msgs
  end
```

## Badge unlock & notifications

```mermaid
flowchart LR
  Roll[Roll badges] --> Merge[mergeCollection + firstEarnedAt]
  Merge --> Local[Codex · NEW filter · NEW ribbon]
  Merge --> Sync[POST /api/sync]
  Sync --> Diff{new badge ids?}
  Diff -->|yes| Act[Activity inbox]
  Diff -->|secret mastery| Sec[secret_mastery notif]
  Sync --> Crown{public roll #1 today/week?}
  Crown -->|yes| Sys[System message broadcast]
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
| `src/state/` | Persistence, roll orchestration, auto-sync |
| `src/ui/` | Screens & motion (reel, cascade, codex) |
| `api/` | Vercel route entrypoints |
| `server/` | Auth, DB, merge, rate limits, roll activity, OG HTML |
| `public/` | Icons, avatars, secret art, PWA |

## Trust model (honest)

| Claim | Reality |
| --- | --- |
| Free-play randomness | Browser CSPRNG + entropy pool — **client-authoritative** |
| Challenge numbers | Deterministic from period seed + subject id |
| Attestation seal | Server HMAC on a **claim** — not proof of honest RNG |
| Leaderboard | Who **synced** with a username — not lottery proof |
| Share links | Only after roll row exists in Neon |

## Related docs

- [Solo design](./superpowers/specs/2026-07-08-rngdle-unlocked-design.md)
- [Social design](./superpowers/specs/2026-07-09-mvp-part2-social-design.md)
- [Feature wave plan](./superpowers/plans/2026-07-09-feature-wave.md)
