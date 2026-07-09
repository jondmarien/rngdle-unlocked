# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-07-09

### Changed

- Internal **architecture refactor** for readability and expandability (`aa8e91e`…`fc4fa65`).
  - **Tooling:** solution-style tsconfigs; `tsconfig.server.json` uses **NodeNext** so missing `.js` ESM imports fail `pnpm typecheck` before Ranked can break on Vercel.
  - **Server:** `server/apiGuards.ts` (`requireUser` / `readJson` / `rateGuard`); read pipelines moved to `server/{leaderboard,profile,feed,ogSvg}.ts`.
  - **Client:** mandatory `src/lib/*-api.ts` wrappers; TanStack Query on leaderboard / feed / highlights / profile / admin-check; Zod at import / sync / profile trust boundaries; `useSync` + split game / settings / cloud contexts.
  - **Quality:** Better Auth session typing; format / StatTile / SegmentedToggle / rarity dedupe; `storage-keys.ts`; dead-code sweep.
- Documentation synced (`AGENTS.md`, `HANDOFF.md`, `README.md`, `docs/ARCHITECTURE.md`, refactor notes, oauth setup).

### Notes

- **No intentional behavior, API contract, or game-rule changes.**
- Manual AGENTS.md §9 roll-mode browser smoke is still required before claiming reel UX verified.
- Package had been at `0.4.1` without a GitHub `v0.4.1` tag; this release jumps to **0.5.0** for the architecture pass (product commits between `v0.4.0` and the refactor are included in `main` history).

## [0.4.1] - untagged

Lived in `package.json` on `main` after `v0.4.0` (OAuth wiring, admin, Latest runs, celebrate FX, email verification, etc.) but **no annotated GitHub release** was cut. Superseded by **0.5.0**.

## [0.4.0] - 2026-07-09

Ranked free play + dual leaderboards (see GitHub release notes).

[0.5.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.5.0
[0.4.0]: https://github.com/jondmarien/rngdle-unlocked/releases/tag/v0.4.0
