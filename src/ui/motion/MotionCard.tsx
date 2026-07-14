import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_EASE, MOTION_MS } from './tokens';

type MotionCardTag = 'div' | 'li' | 'button' | 'article';

/**
 * Interactive card chrome — whileHover / whileTap with Corporate-quick easing.
 * Reduced motion: static (no hover/tap transforms).
 */
export function MotionCard({
  children,
  className,
  hover = true,
  press = true,
  as = 'div',
  onClick,
  type,
  disabled,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  /** Enable hover lift/scale (default true). */
  hover?: boolean;
  /** Enable press scale (default true). */
  press?: boolean;
  as?: MotionCardTag;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const reduceMotion = useReducedMotion();

  const hoverTransition = {
    duration: MOTION_MS.hover / 1000,
    ease: MOTION_EASE,
  };
  const pressTransition = {
    duration: MOTION_MS.press / 1000,
    ease: MOTION_EASE,
  };

  const motionProps = {
    className,
    whileHover:
      reduceMotion || !hover
        ? undefined
        : { y: -2, scale: 1.02, transition: hoverTransition },
    whileTap:
      reduceMotion || !press
        ? undefined
        : { scale: 0.98, transition: pressTransition },
    onClick,
    disabled,
    'aria-label': ariaLabel,
  };

  switch (as) {
    case 'li':
      return <motion.li {...motionProps}>{children}</motion.li>;
    case 'button':
      return (
        <motion.button type={type ?? 'button'} {...motionProps}>
          {children}
        </motion.button>
      );
    case 'article':
      return <motion.article {...motionProps}>{children}</motion.article>;
    case 'div':
      return <motion.div {...motionProps}>{children}</motion.div>;
    default: {
      const _exhaustive: never = as;
      return _exhaustive;
    }
  }
}
