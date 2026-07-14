import { useEffect, useRef, useState } from 'react';
import { ARCADE_DIGITS_ICON } from '../../../lib/arcade-icons';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Digits HUD counter — tweens previous → next (~250–350ms), not 0 → target.
 */
export function ArcadeDigitsDisplay({
  value,
  className = '',
  pulseStakes = false,
}: {
  value: number;
  className?: string;
  /** Phase 4: subtle pulse while cash-out decision is live */
  pulseStakes?: boolean;
}) {
  const target = Math.max(0, Math.round(value));
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    if (from === target) {
      setShown(target);
      return;
    }

    if (prefersReducedMotion()) {
      setShown(target);
      fromRef.current = target;
      return;
    }

    const delta = Math.abs(target - from);
    const duration = Math.min(400, Math.max(220, 180 + Math.sqrt(delta) * 8));
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (target - from) * e));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setShown(target);
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-(--prose-3)">
        Digits
      </p>
      <div
        className={`flex items-center gap-2.5 ${
          pulseStakes ? 'arcade-digits-stakes-pulse' : ''
        }`}
      >
        <img
          src={ARCADE_DIGITS_ICON}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 object-contain drop-shadow-sm"
          aria-hidden
        />
        <p className="mono-number text-3xl font-bold text-amber-500">
          {shown.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
