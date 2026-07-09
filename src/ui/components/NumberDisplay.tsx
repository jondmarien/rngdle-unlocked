import { useEffect, useRef, useState } from 'react';
import type { RarityTier } from '../../game';
import { formatRollDigits } from '../../game/digits';

const SPIN_INTERVAL_MS = 45;
const REVEAL_STAGGER_MS = 140;
const PRE_REVEAL_SPIN_MS = 320;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function randomDigit(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const b = new Uint8Array(1);
    crypto.getRandomValues(b);
    return String(b[0]! % 10);
  }
  return String(((Date.now() / 7) | 0) % 10);
}

/** Natural digits only — zeros that belong to the number are kept; no pad. */
function toDigits(n: number): string[] {
  return formatRollDigits(n).split('');
}

export function NumberDisplay({
  value,
  rarity,
  /** Bumps when a new roll should animate in (0 = snap / idle). */
  revealKey = 0,
  onRevealComplete,
}: {
  value: number | null;
  rarity?: RarityTier;
  revealKey?: number;
  onRevealComplete?: () => void;
}) {
  const [display, setDisplay] = useState<string[]>(() => ['?']);
  const [revealedCount, setRevealedCount] = useState(0);
  const [settled, setSettled] = useState<Set<number>>(() => new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [width, setWidth] = useState(1);

  const targetRef = useRef<string[] | null>(null);
  const revealedRef = useRef(0);
  const completeRef = useRef(onRevealComplete);
  completeRef.current = onRevealComplete;
  const lastSnapValue = useRef<number | null>(null);

  // Idle / history: snap to natural digit length
  useEffect(() => {
    if (value == null) {
      targetRef.current = null;
      revealedRef.current = 0;
      setWidth(1);
      setDisplay(['?']);
      setRevealedCount(0);
      setSettled(new Set());
      setIsAnimating(false);
      lastSnapValue.current = null;
      return;
    }

    if (revealKey > 0) return;

    if (lastSnapValue.current === value && !isAnimating) return;
    lastSnapValue.current = value;
    const digits = toDigits(value);
    const w = digits.length;
    targetRef.current = digits;
    setWidth(w);
    revealedRef.current = w;
    setDisplay([...digits]);
    setRevealedCount(w);
    setSettled(new Set(Array.from({ length: w }, (_, i) => i)));
    setIsAnimating(false);
    completeRef.current?.();
  }, [value, revealKey, isAnimating]);

  // Slot reveal at the number's true digit length
  useEffect(() => {
    if (value == null || revealKey === 0) return;

    const digits = toDigits(value);
    const w = digits.length;
    targetRef.current = digits;
    lastSnapValue.current = value;
    revealedRef.current = 0;
    setWidth(w);

    const timers: number[] = [];
    const clearAll = () => {
      for (const id of timers) window.clearTimeout(id);
    };

    if (prefersReducedMotion()) {
      setDisplay([...digits]);
      setRevealedCount(w);
      setSettled(new Set(Array.from({ length: w }, (_, i) => i)));
      setIsAnimating(false);
      revealedRef.current = w;
      completeRef.current?.();
      return;
    }

    setIsAnimating(true);
    setRevealedCount(0);
    setSettled(new Set());
    setDisplay(Array.from({ length: w }, () => randomDigit()));

    const spinLoop = window.setInterval(() => {
      const locked = revealedRef.current;
      setDisplay((prev) =>
        prev.map((_, i) => {
          if (i < locked) {
            // Keep locked digit exactly (including real '0's in the number)
            return targetRef.current?.[i] ?? '0';
          }
          return randomDigit();
        }),
      );
    }, SPIN_INTERVAL_MS);
    timers.push(spinLoop);

    for (let i = 0; i < w; i++) {
      const delay = PRE_REVEAL_SPIN_MS + i * REVEAL_STAGGER_MS;
      timers.push(
        window.setTimeout(() => {
          revealedRef.current = i + 1;
          setRevealedCount(i + 1);
          setSettled((prev) => new Set(prev).add(i));
          setDisplay((prev) => {
            const next = [...prev];
            // Explicit assign — middle/trailing/solo '0' are never dropped
            next[i] = digits[i]!;
            return next;
          });
          if (i === w - 1) {
            window.clearInterval(spinLoop);
            setIsAnimating(false);
            completeRef.current?.();
          }
        }, delay),
      );
    }

    return clearAll;
  }, [revealKey, value]);

  const colorClass =
    rarity && !isAnimating && revealedCount >= width
      ? `rarity-${rarity}`
      : 'text-[var(--prose)]';

  return (
    <div
      className={`mono-number inline-flex justify-center gap-[0.06em] rounded-xl border border-[var(--outline)] bg-[var(--surface)] px-5 py-3 text-5xl font-bold shadow-sm sm:text-7xl ${colorClass}`}
      aria-label={value == null ? 'No roll yet' : `Rolled ${formatRollDigits(value)}`}
      aria-live="polite"
    >
      {display.map((char, i) => {
        const isRevealed = i < revealedCount;
        const isSpinning = isAnimating && !isRevealed;
        const isSettled = settled.has(i);

        return (
          <span
            key={`${width}-${i}`}
            className={[
              'inline-block min-w-[0.62em] text-center tabular-nums',
              isSpinning ? 'digit-spin text-[var(--prose-3)]' : '',
              isSettled ? 'digit-settle' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}
