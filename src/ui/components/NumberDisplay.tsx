import { useEffect, useRef, useState } from 'react';
import type { RarityTier } from '../../game';
import { formatRollDigits } from '../../game/digits';

const SPIN_INTERVAL_MS = 42;
/** Spin all digits before first lock */
const PRE_LOCK_MS = 380;
/** Delay between locking consecutive digits (left → right) */
const LOCK_STAGGER_MS = 160;

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

function toDigits(n: number): string[] {
  return formatRollDigits(n).split('');
}

const RARITY_GLOW: Record<RarityTier, string> = {
  trash: 'shadow-[0_0_28px_rgba(110,106,98,0.35)] ring-zinc-500/40',
  common: 'shadow-[0_0_36px_rgba(61,122,74,0.45)] ring-emerald-400/50',
  uncommon: 'shadow-[0_0_40px_rgba(45,212,191,0.5)] ring-teal-400/55',
  rare: 'shadow-[0_0_44px_rgba(59,130,246,0.55)] ring-blue-400/60',
  epic: 'shadow-[0_0_48px_rgba(167,139,250,0.55)] ring-violet-400/60',
  anomaly: 'shadow-[0_0_52px_rgba(234,88,12,0.55)] ring-orange-400/65',
  mythic: 'shadow-[0_0_56px_rgba(219,39,119,0.55)] ring-pink-400/70',
};

export function NumberDisplay({
  value,
  rarity,
  /** Bumps when a new roll should animate in (0 = snap / idle). */
  revealKey = 0,
  onRevealComplete,
  spinning = false,
}: {
  value: number | null;
  rarity?: RarityTier;
  revealKey?: number;
  onRevealComplete?: () => void;
  /** True while the roll request is in flight (pre-result scramble). */
  spinning?: boolean;
}) {
  const [display, setDisplay] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => '?'),
  );
  const [lockedCount, setLockedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [settlingIdx, setSettlingIdx] = useState<number | null>(null);

  const targetRef = useRef<string[] | null>(null);
  const lockedRef = useRef(0);
  const completeRef = useRef(onRevealComplete);
  completeRef.current = onRevealComplete;
  const lastSnapValue = useRef<number | null>(null);
  const lastRevealKey = useRef(0);

  // Idle snap (no animation)
  useEffect(() => {
    if (value == null) {
      targetRef.current = null;
      lockedRef.current = 0;
      // Board clear / mode switch — allow the next revealKey=1 to animate again
      lastRevealKey.current = 0;
      setDisplay(Array.from({ length: 6 }, () => '?'));
      setLockedCount(0);
      setIsAnimating(false);
      setSettlingIdx(null);
      lastSnapValue.current = null;
      return;
    }

    if (revealKey > 0 || spinning) return;

    if (lastSnapValue.current === value && !isAnimating) return;
    lastSnapValue.current = value;
    const digits = toDigits(value);
    targetRef.current = digits;
    lockedRef.current = digits.length;
    setDisplay([...digits]);
    setLockedCount(digits.length);
    setIsAnimating(false);
    setSettlingIdx(null);
  }, [value, revealKey, spinning, isAnimating]);

  // Pre-result scramble while waiting for roll()
  useEffect(() => {
    if (!spinning || revealKey > 0) return;
    if (prefersReducedMotion()) {
      setIsAnimating(true);
      return;
    }

    setIsAnimating(true);
    lockedRef.current = 0;
    setLockedCount(0);
    setSettlingIdx(null);
    const w = 6;
    setDisplay(Array.from({ length: w }, () => randomDigit()));

    const spinLoop = window.setInterval(() => {
      setDisplay((prev) => prev.map(() => randomDigit()));
    }, SPIN_INTERVAL_MS);

    return () => window.clearInterval(spinLoop);
  }, [spinning, revealKey]);

  // Scramble, then lock digits left → right one by one
  useEffect(() => {
    if (value == null || revealKey === 0) {
      // Parent reset the board — forget last played reveal id
      if (revealKey === 0) lastRevealKey.current = 0;
      return;
    }
    if (revealKey === lastRevealKey.current) return;
    lastRevealKey.current = revealKey;

    const digits = toDigits(value);
    const w = digits.length;
    targetRef.current = digits;
    lastSnapValue.current = value;
    lockedRef.current = 0;

    const timers: number[] = [];
    let spinLoop = 0;

    const clearAll = () => {
      window.clearInterval(spinLoop);
      for (const id of timers) window.clearTimeout(id);
    };

    if (prefersReducedMotion()) {
      setDisplay([...digits]);
      lockedRef.current = w;
      setLockedCount(w);
      setIsAnimating(false);
      setSettlingIdx(null);
      completeRef.current?.();
      return clearAll;
    }

    setIsAnimating(true);
    setLockedCount(0);
    setSettlingIdx(null);
    setDisplay(Array.from({ length: w }, () => randomDigit()));

    spinLoop = window.setInterval(() => {
      const locked = lockedRef.current;
      setDisplay((prev) =>
        prev.map((_, i) => {
          if (i < locked) return targetRef.current?.[i] ?? '0';
          return randomDigit();
        }),
      );
    }, SPIN_INTERVAL_MS);

    for (let i = 0; i < w; i++) {
      const delay = PRE_LOCK_MS + i * LOCK_STAGGER_MS;
      timers.push(
        window.setTimeout(() => {
          lockedRef.current = i + 1;
          setLockedCount(i + 1);
          setSettlingIdx(i);
          setDisplay((prev) => {
            const next = [...prev];
            next[i] = digits[i]!;
            // keep already-locked exact
            for (let j = 0; j < i; j++) next[j] = digits[j]!;
            return next;
          });
          if (i === w - 1) {
            window.clearInterval(spinLoop);
            setIsAnimating(false);
            timers.push(
              window.setTimeout(() => {
                setSettlingIdx(null);
                completeRef.current?.();
              }, 220),
            );
          }
        }, delay),
      );
    }

    return clearAll;
  }, [revealKey, value]);

  const fullySettled = !isAnimating && lockedCount > 0 && value != null;
  const glow =
    fullySettled && rarity
      ? RARITY_GLOW[rarity]
      : isAnimating
        ? 'shadow-[0_0_32px_rgba(255,255,255,0.12)] ring-white/15'
        : 'shadow-sm ring-[var(--outline)]';

  const colorClass =
    fullySettled && rarity
      ? `rarity-${rarity}`
      : isAnimating
        ? 'text-[var(--prose-2)]'
        : 'text-[var(--prose)]';

  return (
    <div
      className={[
        'mono-number relative inline-flex justify-center gap-[0.08em] rounded-2xl border border-transparent bg-[var(--surface)] px-6 py-4 text-5xl font-bold tracking-tight ring-2 transition-[box-shadow,color] duration-300 sm:px-8 sm:py-5 sm:text-7xl',
        glow,
        colorClass,
        isAnimating ? 'number-reel-pulse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        value == null
          ? 'No roll yet'
          : isAnimating
            ? 'Rolling'
            : `Rolled ${formatRollDigits(value)}`
      }
      aria-live="polite"
    >
      {display.map((char, i) => {
        const locked = i < lockedCount;
        const spinningDigit = isAnimating && !locked;
        const justSettled = settlingIdx === i;

        return (
          <span
            key={`${display.length}-${i}`}
            className={[
              'inline-block min-w-[0.62em] text-center tabular-nums',
              spinningDigit ? 'digit-spin opacity-90' : '',
              justSettled ? 'digit-settle' : '',
              locked && !spinningDigit ? 'text-inherit' : '',
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
