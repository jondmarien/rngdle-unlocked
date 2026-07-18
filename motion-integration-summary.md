# Motion integration summary

Shipped on `main` as separate phase commits (2026-07-14), then cut as **v0.16.2**.

## Code-confirmed baseline (Phase 0)

Overnight FR batch claims were **independently re-read** before trusting “Done”:

| Surface                 | Confirmed in code                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motion@^12.42.2`       | [`package.json`](package.json)                                                                                                                                         |
| Toasts                  | [`ToastViewport.tsx`](src/ui/feedback/ToastViewport.tsx) — `AnimatePresence`, slide/fade/scale, `layout`, `useReducedMotion`                                           |
| Confirm / Prompt        | [`ConfirmDialogHost.tsx`](src/ui/feedback/ConfirmDialogHost.tsx), [`PromptDialogHost.tsx`](src/ui/feedback/PromptDialogHost.tsx) — same pattern + Portal `keepMounted` |
| Home unlock → lightbox  | [`HomeScreen.tsx`](src/ui/screens/HomeScreen.tsx) `layoutId={`home-badge-…`}`                                                                                          |
| History Highlights fade | [`HistoryScreen.tsx`](src/ui/screens/HistoryScreen.tsx) `motion.div` + opacity                                                                                         |

Provisional FR claims matched real code for Phases 1–2/partial-4; remaining gaps were conventions, shop gestures, Arcade Run/Meta, Collection layout.

## What shipped per phase

### Phase 0 — LottieFiles `motion-design` skill

- Installed project skill: `.agents/skills/motion-design` + `skills-lock.json`
- Smoke-invoked `SKILL.md` 8-step checklist → locked house style **Corporate-quick** (150/200/300ms, ease `[0.2,0,0,1]`, minimal overshoot)
- Documented in [`AGENTS.md`](AGENTS.md) frontend conventions
- Commit: `8efca67`

### Phase 1 — Conventions + primitives + PoC

- [`src/lib/motion-conventions.md`](src/lib/motion-conventions.md)
- Primitives: [`src/ui/motion/`](src/ui/motion/) — `FadeIn`, `MotionCard`, `tokens` (`MOTION_EASE` / `MOTION_MS`)
- [`ScreenFallback`](src/ui/components/ScreenFallback.tsx) fade PoC
- Did **not** reinstall `motion` (already present)
- Commit: `d2e3b70`

### Phase 2 — Toasts & dialogs (verify + light hardening)

- **Verified as working:** AnimatePresence exit detection, multi-toast `layout` reflow, reduced-motion gates — no `popLayout` change needed
- Aligned enter/exit to Corporate-quick tokens (exit ~70% of enter, ease-in exits)
- Added fade/scale enter on [`RollReplayModal`](src/ui/components/RollReplayModal.tsx)
- CHANGELOG documents the verification (not silent)
- Commit: `a720c64`

### Phase 3 — Shop cards & Collection gestures

- [`ArcadeShopCard`](src/ui/components/arcade/ArcadeShopCard.tsx): `whileHover` / `whileTap` + buy/deny `animate`
- Stopped applying `.arcade-shop-card-buy` / `.arcade-shop-card-deny` (avoid double-animation); **keyframes left untouched** in `global.css`
- Owned upgrade purchase flash via Motion `animate` scale
- Collection Journey / Lifetime / Secret art: `MotionCard` hover/press (same easing family as chrome; press 120ms)
- Commit: `6ab52b8`

### Phase 4 — Layout transitions

- Arcade Run | Meta panel opacity fade (History pattern)
- Collection filter chips: shared `layoutId="collection-filter-pill"`
- Collection art → `BadgeArtLightbox` via `layoutId={`collection-badge-${id}`}`
- Home / History prior layout work left alone
- Commit: `8b2bac2`

## Bundle-size notes

Motion was **already in the client main graph** from v0.16.1 (toasts/dialogs/lightbox).

| Build checkpoint                     | Main `index-*.js` | gzip          |
| ------------------------------------ | ----------------- | ------------- |
| Pre Phase 1 (Motion already present) | **184 123** B     | ~**55.14** KB |
| After Phase 1 PoC                    | **184 447** B     | ~**55.27** KB |
| After Phases 2–4                     | **185 786** B     | ~**55.55** KB |

**Delta this pass (new Motion call sites + tokens/primitives):** about **+1.6 KB** raw / **+0.4 KB** gzip on the main index chunk. No separate `vendor-motion` chunk — Motion tree-shakes into the app graph (`motion/react` imports only). Clean pre-`motion` package baseline was not available in this environment (dep landed with overnight FR batch).

## LottieFiles skill usage

| Decision          | Skill input                                        | Applied as                                   |
| ----------------- | -------------------------------------------------- | -------------------------------------------- |
| House personality | Corporate archetype + duration tables              | Corporate-quick 150/200/300ms, `[0.2,0,0,1]` |
| Enter vs exit     | Exit = 65–75% of enter; exit ease-in               | Toast/dialog exit ~0.7× enter                |
| Shop press        | Interactive feedback &lt;150ms; same easing family | `MOTION_MS.press = 120`, no spring overshoot |
| Reduced motion    | Opacity/instant alternatives                       | `useReducedMotion` on every new surface      |
| Layout chrome     | Keep UI transitions short                          | Arcade/Collection ≤200ms                     |

Skill path: `.agents/skills/motion-design` (reference for future agents via AGENTS.md).

## Guardrails honored

- **Untouched** in `global.css`: Celebration, NumberDisplay digit-spin, Arcade FX keyframes (including unused shop buy/deny keyframes)
- Prefer primitives (`FadeIn` / `MotionCard` / tokens) over ad-hoc Motion soup
- No paid services; pnpm-only; work committed on `main`

## Manual smoke checklist

1. Toast stack enter/exit + dismiss
2. Confirm dialog fade/scale
3. Arcade shop hover/tap + buy → owned (no double flash)
4. Collection filter pill slide; art → lightbox morph
5. Arcade Run ↔ Meta fade
6. `prefers-reduced-motion: reduce` → no spatial Motion
