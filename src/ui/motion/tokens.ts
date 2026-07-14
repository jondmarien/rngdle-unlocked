/** Corporate-quick house motion tokens (see `src/lib/motion-conventions.md`). */
export const MOTION_EASE = [0.2, 0, 0, 1] as const;

export const MOTION_MS = {
  quick: 150,
  standard: 200,
  slow: 300,
  /** Tap/press feedback — snappier than chrome, same easing family. */
  press: 120,
  hover: 100,
} as const;
