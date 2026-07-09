import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Animated EP total — counts up as badges cascade in. */
export function CountUpEP({
  value,
  /** When true show ??? during spin */
  pending = false,
  className = '',
}: {
  value: number;
  pending?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (pending) {
      setShown(0);
      fromRef.current = 0;
      return;
    }

    if (prefersReducedMotion()) {
      setShown(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setShown(to);
      return;
    }

    const duration = Math.min(900, 280 + Math.abs(to - from) * 0.04);
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const e = 1 - (1 - t) ** 3;
      const next = Math.round(from + (to - from) * e);
      setShown(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, pending]);

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
