# Architecture

RNGdle Unlocked is a **client-first** number game with an **optional** cloud social layer and a **server-issued Ranked** free-play path for fair competition.

July 2026 readability refactor summary: [`refactor-notes-2026-07.md`](./refactor-notes-2026-07.md).

## High-level

```mermaid
flowchart TB
  subgraph Browser
    UI[React SPA]
    LibApi[lib API wrappers]
    TQ[TanStack Query]
    Engine[game engine pure TS]
    LS[(localStorage)]
    UI --> LibApi
    UI --> TQ
    TQ --> LibApi
    UI --> Engine
    UI --> LS
  end

  subgraph Vercel
    Static[Static dist]
    API[Thin api handlers]
    Guards[apiGuards]
    Server[server pipelines]
    Ranked[POST ranked-roll]
  end

  subgraph Neon
    DB[(Postgres rolls source)]
  end

  Static --> UI
  LibApi -->|auth sync Practice board| API
  LibApi -->|Ranked Generate| Ranked
  API --> Guards
  Guards --> Server
  Server --> DB
  Ranked --> DB
```

## Roll modes

| Mode               | RNG                | Persist                                           | Competitive surfaces                                  |
| ------------------ | ------------------ | ------------------------------------------------- | ----------------------------------------------------- |
| **Free play**      | Browser CSPRNG     | localStorage → sync as `source=client`            | **Leaderboard → Practice** only                       |
| **Ranked**         | Server CSPRNG      | Neon `source=ranked` first; client merges history | **Leaderboard → Ranked**, community crowns, overtakes |
| **Daily / Weekly** | Deterministic seed | sync as `source=challenge`                        | Optional challenge; not Ranked crowns                 |

Mode switch fully resets the home reel / session roll (and abandons in-flight Generate).

## Free play lifecycle

```mermaid
sequenceDiagram
  participant U as User
  participant H as HomeScreen
  participant G as GameProvider
  participant Sync as useSync
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
    G->>Sync: enqueueAutoSync
    Sync->>C: auto-sync merge source=client
    C-->>Sync: merged cloud
    Note over C: unlock notifs only — no Ranked crowns
  end
```

## Ranked free play lifecycle

```mermaid
sequenceDiagram
  participant U as User
  participant H as HomeScreen
  participant G as GameProvider
  participant RollApi as roll-api
  participant R as /api/ranked-roll
  participant DB as Neon
  participant A as rollActivity

  U->>H: Generate Ranked
  H->>G: roll() ranked
  G->>RollApi: requestRankedRoll
  RollApi->>R: POST credentials
  R->>R: apiGuards + username + rate limit
  R->>R: server CSPRNG + evaluateBadges
  R->>DB: insert rolls source=ranked
  R->>A: crowns / overtake if #1
  R-->>RollApi: RollResult
  RollApi-->>G: RollResult
  G->>G: local history + collection merge
  G-->>H: lastRoll source=ranked
  Note over DB: Leaderboard Ranked + highlights query source=ranked
```

## Client data layer

- **Mandatory `src/lib/*-api.ts` wrappers** — UI must not call `fetch('/api/...')` directly (PNG `dataUrl` blob fetches are fine).
- **TanStack Query** (`QueryClientProvider` in `src/main.tsx`) caches leaderboard, feed, highlights, profile, and admin-check reads. Some screens still use effects + wrappers (notifications, account).
- **Zod** validates save import payloads, cloud sync POST bodies, and public profile GET responses — not every endpoint.

## Server handler pattern

- Thin `api/*` entrypoints use `defineHandler` + [`server/apiGuards.ts`](../server/apiGuards.ts) (`requireUser` / `readJson` / `rateGuard`).
- **Read pipelines** live in `server/{leaderboard,profile,feed,ogSvg,notifications}.ts`.
- Some write handlers (`follow`, `me`, `attest`, sync orchestration) still keep more logic inline — prefer extracting when touching them.
- **`tsconfig.server.json`** uses **NodeNext** / **nodenext** so extensionless relative imports fail `pnpm typecheck` before deploy.

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
- Sync **rejects** payloads that claim another user’s roll ids or inflate EP/collection without matching rolls (`SyncIntegrityError` → 409).
- Public profiles expose progress provenance pills (`cloud_sync` / `cloned_local` / `local_progress`) from best-roll ownership.

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

| Path              | Responsibility                                                                 |
| ----------------- | ------------------------------------------------------------------------------ |
| `src/game/`       | Pure rules: RNG, badges, rarity, secrets, challenges, share text               |
| `src/state/`      | `GameProvider` contexts, `useSync`, settings reducer, localStorage             |
| `src/lib/`        | `*-api.ts` wrappers, `schemas.ts`, auth client, routes, themes                 |
| `src/ui/`         | Screens & motion (reel, cascade, codex, dual boards)                           |
| `api/`            | Thin Vercel route entrypoints                                                  |
| `server/`         | `apiGuards`, auth, DB, merge, ranked issue, read pipelines, rate limits, OG    |
| `public/`         | Icons, avatars, secret art, Absolute Ceiling badge, PWA                        |

## Trust model (honest)

| Claim                       | Reality                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Free-play randomness        | Browser CSPRNG + entropy pool — **client-authoritative**; Practice board honor system |
| Ranked free-play randomness | **Server CSPRNG** via `/api/ranked-roll`; scores server-side; `source=ranked`         |
| Challenge numbers           | Deterministic from period seed + subject id                                           |
| Attestation seal            | Server HMAC on a **claim** — not proof of honest client RNG                           |
| Leaderboard Ranked          | Fair competition baseline (server-issued only)                                        |
| Leaderboard Practice        | Who **synced** free-play progress with a username                                     |
| Community crowns            | Ranked rolls only                                                                     |
| Share links                 | Only after roll row exists in Neon                                                    |
| Runtime schema validation   | Zod at **import / sync / profile** boundaries only — not blanket on every API         |

## Related docs

- [Refactor notes (July 2026)](./refactor-notes-2026-07.md)
- [Opus audit + §H implementation status](./opus-report.md)
- [Solo design](./superpowers/specs/2026-07-08-rngdle-unlocked-design.md) _(historical)_
- [Social design](./superpowers/specs/2026-07-09-mvp-part2-social-design.md) _(historical)_
- [Feature wave plan](./superpowers/plans/2026-07-09-feature-wave.md) _(historical)_
