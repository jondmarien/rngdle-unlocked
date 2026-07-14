import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_EASE, MOTION_MS } from './tokens';

/** Match RouteEnter enter offset so cold settle feels like the same family. */
const ENTER_Y = 10;

/**
 * Fades in once resolved Suspense children mount (after the fallback unmounts).
 * Mount inside `<Suspense>` around real screens — not around the fallback.
 *
 * Always runs an enter animation on mount (opacity + small y). Warm/cached
 * navigations mount this in the same turn as RouteEnter, so the two fades
 * composite together as one settle. Cold navigations mount this only after
 * "Loading…" — this animation is what prevents the content snap.
 */
export function SuspenseReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : MOTION_MS.standard / 1000;

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: ENTER_Y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
