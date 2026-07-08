import { useEffect, useRef, useState } from 'react';
import type { RarityTier } from '../../game';
import { ROLL_MAX } from '../../game';

/** Max display width: "1000000" is 7 digits. */
export const DISPLAY_WIDTH = String(ROLL_MAX).length;

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

/** Fixed-width pad with spaces for leading blanks (RNGdle-style). */
function padDigits(n: number): string[] {
  return String(n).padStart(DISPLAY_WIDTH, ' ').split('');
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
  const [display, setDisplay] = useState<string[]>(() =>
    Array.from({ length: DISPLAY_WIDTH }, () => '?'),
  );
  const [revealedCount, setRevealedCount] = useState(0);
  const [settled, setSettled] = useState<Set<number>>(() => new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  const targetRef = useRef<string[] | null>(null);
  const revealedRef = useRef(0);
  const completeRef = useRef(onRevealComplete);
  completeRef.current = onRevealComplete;
  const lastSnapValue = useRef<number | null>(null);

  // Snap when value changes without a new revealKey (history / first paint)
  useEffect(() => {
    if (value == null) {
      targetRef.current = null;
      revealedRef.current = 0;
      setDisplay(Array.from({ length: DISPLAY_WIDTH }, () => '?'));
      setRevealedCount(0);
      setSettled(new Set());
      setIsAnimating(false);
      lastSnapValue.current = null;
      return;
    }

    if (revealKey > 0) return; // handled by reveal effect

    if (lastSnapValue.current === value && !isAnimating) return;
    lastSnapValue.current = value;
    const digits = padDigits(value);
    targetRef.current = digits;
    revealedRef.current = DISPLAY_WIDTH;
    setDisplay(digits.map((c) => (c === ' ' ? ' ' : c)));
    setRevealedCount(DISPLAY_WIDTH);
    setSettled(new Set(Array.from({ length: DISPLAY_WIDTH }, (_, i) => i)));
    setIsAnimating(false);
    completeRef.current?.();
  }, [value, revealKey, isAnimating]);

  // Slot-machine reveal on each new roll
  useEffect(() => {
    if (value == null || revealKey === 0) return;

    const digits = padDigits(value);
    targetRef.current = digits;
    lastSnapValue.current = value;
    revealedRef.current = 0;

    const timers: number[] = [];
    const clearAll = () => {
      for (const id of timers) window.clearTimeout(id);
    };

    if (prefersReducedMotion()) {
      setDisplay(digits.map((c) => (c === ' ' ? ' ' : c)));
      setRevealedCount(DISPLAY_WIDTH);
      setSettled(new Set(Array.from({ length: DISPLAY_WIDTH }, (_, i) => i)));
      setIsAnimating(false);
      revealedRef.current = DISPLAY_WIDTH;
      completeRef.current?.();
      return;
    }

    setIsAnimating(true);
    setRevealedCount(0);
    setSettled(new Set());
    setDisplay(Array.from({ length: DISPLAY_WIDTH }, () => randomDigit()));

    const spinLoop = window.setInterval(() => {
      const locked = revealedRef.current;
      setDisplay((prev) =>
        prev.map((_, i) => {
          if (i < locked) {
            const t = targetRef.current?.[i] ?? '?';
            return t === ' ' ? ' ' : t;
          }
          return randomDigit();
        }),
      );
    }, SPIN_INTERVAL_MS);
    timers.push(spinLoop);

    for (let i = 0; i < DISPLAY_WIDTH; i++) {
      const delay = PRE_REVEAL_SPIN_MS + i * REVEAL_STAGGER_MS;
      timers.push(
        window.setTimeout(() => {
          revealedRef.current = i + 1;
          setRevealedCount(i + 1);
          setSettled((prev) => new Set(prev).add(i));
          setDisplay((prev) => {
            const next = [...prev];
            const t = digits[i]!;
            next[i] = t === ' ' ? ' ' : t;
            return next;
          });
          if (i === DISPLAY_WIDTH - 1) {
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
    rarity && !isAnimating && revealedCount >= DISPLAY_WIDTH
      ? `rarity-${rarity}`
      : 'text-[var(--prose)]';

  return (
    <div
      className={`mono-number flex justify-center gap-[0.06em] text-5xl font-bold sm:text-7xl ${colorClass}`}
      aria-label={value == null ? 'No roll yet' : `Rolled ${value.toLocaleString()}`}
      aria-live="polite"
    >
      {display.map((char, i) => {
        const targetChar = targetRef.current?.[i];
        const isLeadingBlank =
          (i < revealedCount && targetChar === ' ') || char === ' ';
        const isRevealed = i < revealedCount;
        const isSpinning = isAnimating && !isRevealed;
        const isSettled = settled.has(i) && targetChar !== ' ';

        return (
          <span
            key={i}
            className={[
              'inline-block min-w-[0.62em] text-center tabular-nums',
              isSpinning ? 'digit-spin text-[var(--prose-3)]' : '',
              isLeadingBlank && isRevealed
                ? 'w-[0.28em] min-w-0 overflow-hidden opacity-0'
                : '',
              isSettled ? 'digit-settle' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isLeadingBlank && isRevealed ? '\u00A0' : isSpinning ? char : char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  );
}
