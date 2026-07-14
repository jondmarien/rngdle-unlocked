import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_EASE, MOTION_MS } from './tokens';

/** Subtle opacity enter for leaf chrome (Suspense fallbacks, light panels). */
export function FadeIn({
  children,
  className,
  y = 0,
  durationMs = MOTION_MS.standard,
}: {
  children: ReactNode;
  className?: string;
  /** Optional enter offset in px (0 = opacity-only). */
  y?: number;
  durationMs?: number;
}) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : durationMs / 1000;

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
