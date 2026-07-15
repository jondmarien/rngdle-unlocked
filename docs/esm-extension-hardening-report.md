# ESM `.js`-extension hardening — verification report (opus-report G1)

**Date:** 2026-07-15
**Scope:** api/ + server/ + src/game import graph (the "apiserver tsconfig" side only)
**Outcome:** No changes required — the G1 fix already landed and holds on every axis checked.

## Summary

opus-report.md G1 flagged that `moduleResolution: "bundler"` on the api/server tsconfig let
extensionless relative imports typecheck green while Node ESM under Vercel's `/var/task`
requires explicit `.js` extensions — the root cause of the recurring Ranked
`FUNCTION_INVOCATION_FAILED` outage (HANDOFF.md §2, AGENTS.md §5.3/§11).

This follow-up investigation set out to quantify the blast radius of migrating to
`nodenext` and to choose between that migration and a lint/grep guard. The premise turned
out to be stale: **the migration already shipped** (commit `3d302f2`; opus-report §H marks
"G1 NodeNext for api/server — Done"). What follows is the verification that the fix is
real, complete, and compatible with the rest of the toolchain.

## Findings

### 1. Violation count: 0 in production code

A sweep of `api/`, `server/`, and `src/game/` for relative imports missing `.js` extensions
found **34 hits, all inside `src/game/**/*.test.ts`** (18 test files). Test files never
deploy and are type-checked by the bundler-mode app config (`tsconfig.app.json`), where
extensionless imports are correct. Every shipped `.ts` file in the graph uses explicit
`.js` extensions — consistent with the prior audit's "0 violations" claim.

### 2. Config landscape

| Config | Resolution | Governs |
| --- | --- | --- |
| `tsconfig.json` (root) | `module: NodeNext` / `moduleResolution: nodenext` | `api/**` + `server/**` (+ transitively imported `src/game` files). Root placement is deliberate: Vercel typechecks `/api` against the root config and ignores project references. |
| `tsconfig.server.json` | extends root | `pnpm typecheck`'s server pass |
| `tsconfig.app.json` | `bundler` | `src/**` (Vite app, including game tests) |
| `tsconfig.node.json` | `nodenext` | `vite.config.ts` only |

`pnpm typecheck` runs all three and currently exits 0.

### 3. The nodenext "spike" is the live config — 0 errors

`tsc -p tsconfig.server.json --noEmit` produces no diagnostics. Bundler mode was not
silently hiding any latent violations; there is no error backlog to burn down.

### 4. src/game consumer collateral: none

The server program transitively pulls **28** `src/game` files into nodenext checking; all
use `.js`-extensioned internals. Six non-test game files sit outside that program
(`index.ts`, `arcade/index.ts`, `digits.ts`, `evaluate.ts`, `fx.ts`, `shareText.ts`) —
client-only, bundler-checked, and also already `.js`-disciplined. `src/state`/`src/lib`/
`src/ui` import `../game` extensionless under the bundler app config, which nodenext does
not touch, so the documented intentional asymmetry (G3) is preserved.

### 5. Patched-TypeScript compatibility: confirmed

`tsc` is native TypeScript 7.0.2. `scripts/patch-typescript-api.cjs` only redirects
`require("typescript")` to `@typescript/typescript6` (classic API for Vercel's builder);
the `tsc` binary is untouched, and the nodenext typecheck passes under it.

### 6. Vitest compatibility: confirmed

`vp test --run server/rankedRoll.test.ts src/game/rng.test.ts` — one file using
`.js`-style imports, one extensionless — passes 13/13. Vitest resolves both styles, so the
mixed convention costs nothing at test time.

### 7. Second runtime safety layer

`scripts/bundle-api.mjs` esbuild-bundles every api handler on Vercel (`build:vercel`),
resolving relative imports at build time. The original runtime failure mode is therefore
doubly mitigated: nodenext catches it at typecheck, and bundling would absorb it even if
one slipped through.

## Recommendation

**Keep nodenext (already in place); adopt no additional lint/grep guard.**

The compile-time guarantee the task asked for exists, is green, is compatible with the
patched TS 7 toolchain and vitest, and is backstopped by esbuild bundling at deploy time.
An ESLint or grep-based guard would be redundant tooling with real false-positive surface —
it would need to exempt the 18 extensionless game test files and every bundler-side
consumer import — for zero marginal safety.

**Accepted residual gap (near-nil):** the six client-only `src/game` files above are
outside the nodenext program, so a new extensionless import there would typecheck green
today. It self-heals: the moment any server code imports such a file, it enters the
nodenext program and `pnpm typecheck` fails — i.e. before the code can reach the Vercel
runtime — and the esbuild bundle would resolve it even then. Widening the root `include`
to cover them is not worth it: it would drag the extensionless test files into the
nodenext program and break them, or require carving test exclusions into the server
config for no practical risk reduction.

**Do not revert the server project to `bundler`** — reiterating AGENTS.md §11.
