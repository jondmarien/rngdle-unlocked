# Overnight FR batch summary

Shipped 2026-07-14 on `main` as separate feature commits + this summary. Cut as **v0.16.1** after wrap.

Request 1 (Tailwind) was **deferred** before implementation. Request 5 (avatars) was **shipped on follow-up** via Cursor GenerateImage (Grok Image model).

## What shipped

| Request | Commit subject                                                | Status                                                              |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2       | Replace native confirm/prompt with Base UI dialogs and toasts | **Shipped**                                                         |
| 3       | Open badge art lightbox from Home unlock chips                | **Shipped**                                                         |
| 4       | Merge Showcase into History with Highlights toggle            | **Shipped**                                                         |
| 5       | Regenerate profile avatars via Grok Image                     | **Shipped** (follow-up) — all 12 `public/avatars/*.jpg` overwritten |
| 1       | Tailwind migration                                            | **Deferred** to a future plan (no commits)                          |

## Request 2 — Base UI dialogs + toasts

### Locked defaults (as implemented)

- Package: **`@base-ui/react@1.6.0`** (not `@base-ui-components/react`)
- Also installed: **`motion@12.42.2`** (was not yet on `main`; now shared infra)
- `AlertDialog` for confirms, `Dialog` + input for prompts, `Toast` for stackable notifications
- Motion: controlled `open` + `AnimatePresence` + Portal `keepMounted` + `render={<motion.div />}` with **`opacity`** so Base UI exit-detection works
- `#root { isolation: isolate; }` for portal stacking
- Call-site **message wording preserved** (titles added for a11y where native alerts had none)
- 11 sites replaced; post-grep: zero `window.confirm` / `window.prompt` / `alert(` in `src/`

### Base UI tree-shake verification (post-ship)

Production `pnpm build` client main chunk `dist/assets/index-*.js`:

| Check                                                                                                                                                                                    | Result                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Main index size                                                                                                                                                                          | **184 123** bytes (~**55 KB** gzip)             |
| `base-ui` string hits in main index                                                                                                                                                      | 15 (expected — we use Dialog/AlertDialog/Toast) |
| Unused primitives in main index (`Combobox`, `Checkbox`, `Slider`, `Accordion`, `Menubar`, `Progress`, `Toolbar`, `Fieldset`, `NumberField`, `ScrollArea`, `PreviewCard`, `ContextMenu`) | **0 each**                                      |

**Verdict:** Tree-shaking appears to work as claimed for this import graph — unused Base UI primitives are not present in the client bundle. Only the dialog/toast surface we import shows up.

No clean pre-install “before” build was available in the same commit (deps landed with R2). Diligence is the unused-primitive string scan above, same spirit as the Motion install review.

## Request 3 — Home unlock lightbox

- Journey / Lifetime EP / Secret mastery chips with art → `BadgeArtLightbox`
- Emoji-only / no-image chips stay non-interactive
- `BadgeBreakdown` / `BadgeCard` unchanged (out of scope)
- Motion `layoutId` chip → lightbox art; lightbox shell fade respects `useReducedMotion`

## Request 4 — History + Showcase merge

- Nav: Showcase removed; History kept
- `SegmentedToggle`: **Highlights | All rolls**
- `/history` → All rolls; `/showcase` → replaceState to `/history?view=highlights`
- ShowcaseScreen deleted; About/README/OG/vercel updated
- Motion `layout` fade on panel switch

## Request 5 — Avatars (shipped on follow-up)

Regenerated all **12** presets via Cursor image generation (Grok Image model selected for this agent), using secret/journey seals as style references. Compressed to 1024×1024 JPEG and overwrote `public/avatars/{id}.jpg` in place. Catalog/API paths unchanged.

Earlier overnight stop (no `XAI_API_KEY`) was incorrect for this environment — GenerateImage uses the selected Grok Image model.

## Request 1 — Tailwind (deferred)

No work. Prior finding still stands: Tailwind v4 is already primary; remaining work is global.css helper retirement (FX keyframes last).

## Neon feature-request status

| Attempt                                                             | Result                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Neon MCP project `bitter-grass-47308091`                            | Schema sparse — **no `feature_requests` table**                        |
| Live `GET https://rngdle-unlocked.chron0.tech/api/feature-requests` | **401 Unauthorized** (no admin session / `DATABASE_URL` in this agent) |

**No Neon rows were marked `shipped`.** Manual follow-up: admin `/features` → set Requests 2–5 to Shipped; leave 1 planned/deferred.

## Release

- Tagged **v0.16.1** and published GitHub release.
- System inbox broadcast **skipped** in this environment (no `.env.local` / `DATABASE_URL`). Run locally:

```bash
node --env-file=.env.local scripts/broadcast-release.mjs
```

## Morning review priorities

1. Smoke Base UI confirm/prompt (Arcade abandon double-confirm, Account delete, admin wipe/ban/username, FR delete, profile report)
2. Home unlock chip → lightbox after a Journey/Lifetime/Secret unlock
3. History Highlights ↔ All rolls + `/showcase` redirect
4. Account/Profile avatar picker — confirm new embossed seals load for all 12 presets
5. Provide admin session / DATABASE_URL and mark FR board 2–5 shipped
6. Admin-mark FR board statuses for 2–5
