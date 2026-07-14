import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_EASE, MOTION_MS } from './tokens';

/** Enter offset for route chrome (Corporate-quick; skipped under reduced motion). */
const ENTER_Y = 10;

/** Exit ≈ 70% of enter so AnimatePresence mode="wait" stays snappy. */
const EXIT_MS = Math.round(MOTION_MS.standard * 0.7);

/**
 * Route-level enter/exit wrapper for AnimatePresence.
 * Opacity + small y on enter; opacity-only exit; instant when reduced motion.
 */
export function RouteEnter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const enterDuration = reduceMotion ? 0 : MOTION_MS.standard / 1000;
  const exitDuration = reduceMotion ? 0 : EXIT_MS / 1000;

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: ENTER_Y }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduceMotion
          ? undefined
          : {
              opacity: 0,
              transition: { duration: exitDuration, ease: MOTION_EASE },
            }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: enterDuration, ease: MOTION_EASE }
      }
    >
      {children}
    </motion.div>
  );
}
