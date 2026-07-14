# Motion conventions (RNGdle Unlocked)

Shared rules for UI animation with **Motion for React** (`motion` → import from `motion/react`).

## When to use Motion vs CSS

| Use                                                                                                           | Prefer                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Simple hover / color / opacity on a single element with no exit need                                          | Tailwind / CSS transitions                                                                            |
| Layout animation, shared-element (`layoutId`), exit-on-unmount, gestures (`whileHover` / `whileTap`), springs | Motion                                                                                                |
| Celebration confetti, NumberDisplay digit-spin, Arcade reveal FX                                              | Existing `global.css` keyframes — **do not migrate in Motion polish passes** unless explicitly scoped |

## House style — Corporate-quick

From the LottieFiles `motion-design` skill (`.agents/skills/motion-design`):

| Token                | Value                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Duration palette     | **150 / 200 / 300** ms (quick / standard / slow chrome)                                                |
| Easing               | ease-out / cubic-bezier **`[0.2, 0, 0, 1]`**                                                           |
| Overshoot            | Minimal / none for UI chrome                                                                           |
| Shop press carve-out | Slightly snappier duration (&lt;150ms) OK for tap feedback; **same easing family** (no bouncy springs) |

Enter slightly longer than exit (~exit = 65–75% of enter) when both are animated.

## Reduced motion (non-negotiable)

Every new Motion surface must call `useReducedMotion()` (or a shared helper that does) and:

- Prefer `initial={false}` / `duration: 0` / skip `exit` spatial motion when reduced
- Prefer opacity-only (or instant) alternatives over slide/scale/shake

Existing global CSS also kills animations under `@media (prefers-reduced-motion: reduce)`.

## Shared primitives

Prefer reusable wrappers under [`src/ui/motion/`](../ui/motion/) (`FadeIn`, `MotionCard`, `RouteEnter`) over one-off `motion.div` prop soup. Screens may still use `motion`/`layoutId` directly for shared-element transitions (e.g. badge → lightbox).

| Primitive    | Role                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| `FadeIn`     | Enter-only opacity (+ optional `y`) for leaf chrome (e.g. Suspense fallbacks)                |
| `MotionCard` | Hover/press card chrome                                                                      |
| `RouteEnter` | Route-level enter/exit for `AnimatePresence` in `AppRoutes` (opacity + small `y`; exit ~70%) |

## Imports

```ts
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
```

Do not import from `framer-motion`.
