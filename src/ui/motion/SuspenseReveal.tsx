import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_EASE } from './tokens';

/** Resolves within this window of route start → warm (RouteEnter covers it). */
const WARM_MS = 50;

/** Opacity-only settle when content mounts after a visible Suspense fallback. */
const COLD_FADE_MS = 120;

/**
 * Fades in once resolved Suspense children mount (after the fallback unmounts).
 * Mount inside `<Suspense>` around real screens — not around the fallback.
 *
 * Pass `startedAt` from the route render (e.g. `performance.now()` when the
 * route key changes). If children mount within WARM_MS of that stamp, skip
 * the inner fade so warm/cached navigations rely on RouteEnter alone.
 */
export function SuspenseReveal({
  children,
  className,
  startedAt,
}: {
  children: ReactNode;
  className?: string;
  /** `performance.now()` when this route navigation began. */
  startedAt: number;
}) {
  const reduceMotion = useReducedMotion();
  const warm = performance.now() - startedAt < WARM_MS;
  const skipAnim = Boolean(reduceMotion) || warm;
  const duration = skipAnim ? 0 : COLD_FADE_MS / 1000;

  return (
    <motion.div
      className={className}
      initial={skipAnim ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
