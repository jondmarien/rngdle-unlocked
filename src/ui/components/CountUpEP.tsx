import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Single climb from 0 → target EP.
 * Does not re-target mid-animation when props thrash — only starts a new climb
 * when `runKey` or `pending` transitions to a fresh settled total.
 */
export function CountUpEP({
  value,
  pending = false,
  /** Bump with revealKey so each roll climbs 0 → total once */
  runKey = 0,
  /** Optional fixed duration (ms); default scales with value size */
  durationMs,
  className = '',
}: {
  value: number;
  pending?: boolean;
  runKey?: number;
  durationMs?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const rafRef = useRef(0);
  const lastRunRef = useRef<{ key: number; value: number } | null>(null);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (pending) {
      setShown(0);
      lastRunRef.current = null;
      return;
    }

    const target = Math.max(0, Math.round(value));

    // Same run already finished at this total — don't restart
    if (
      lastRunRef.current &&
      lastRunRef.current.key === runKey &&
      lastRunRef.current.value === target
    ) {
      setShown(target);
      return;
    }

    if (prefersReducedMotion()) {
      setShown(target);
      lastRunRef.current = { key: runKey, value: target };
      return;
    }

    // Always climb from 0 for a clean, non-fighting counter
    setShown(0);
    const duration =
      durationMs ??
      Math.min(1600, Math.max(550, 400 + Math.sqrt(target) * 12));
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic — smooth climb, no overshoot
      const e = 1 - (1 - t) ** 3;
      setShown(Math.round(target * e));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setShown(target);
        lastRunRef.current = { key: runKey, value: target };
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [pending, value, runKey, durationMs]);

  if (pending) {
    return (
      <span
        className={`mono-number inline-flex rounded-full border border-[var(--outline)] bg-[var(--surface-raised)] px-3 py-1 text-sm font-semibold text-[var(--prose-3)] ${className}`}
      >
        ??? EP
      </span>
    );
  }

  return (
    <span
      className={`mono-number inline-flex rounded-full border border-[var(--outline)] bg-[var(--surface)] px-3 py-1 text-base font-bold text-amber-700 dark:text-amber-300 ${className}`}
    >
      {shown.toLocaleString()} EP
    </span>
  );
}
