import { useEffect, useRef, useState } from 'react';
import type { RarityTier } from '../../game';
import { formatRollDigits } from '../../game/digits';

/** Full-reel scramble like rngdle.com before the number locks. */
const SPIN_INTERVAL_MS = 42;
const SPIN_DURATION_MS = 1400;
const SPIN_DURATION_SHORT_MS = 900;

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
  anomaly: 'shadow-[0_0_52px_rgba(232,121,249,0.55)] ring-fuchsia-400/65',
  mythic: 'shadow-[0_0_56px_rgba(251,191,36,0.55)] ring-amber-400/70',
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pop, setPop] = useState(false);

  const targetRef = useRef<string[] | null>(null);
  const completeRef = useRef(onRevealComplete);
  completeRef.current = onRevealComplete;
  const lastSnapValue = useRef<number | null>(null);
  const lastRevealKey = useRef(0);

  // Idle snap (history / no animation)
  useEffect(() => {
    if (value == null) {
      targetRef.current = null;
      setDisplay(Array.from({ length: 6 }, () => '?'));
      setIsAnimating(false);
      setLocked(false);
      setPop(false);
      lastSnapValue.current = null;
      return;
    }

    if (revealKey > 0 || spinning) return;

    if (lastSnapValue.current === value && !isAnimating) return;
    lastSnapValue.current = value;
    const digits = toDigits(value);
    targetRef.current = digits;
    setDisplay([...digits]);
    setIsAnimating(false);
    setLocked(true);
    setPop(false);
  }, [value, revealKey, spinning, isAnimating]);

  // Pre-result scramble while waiting for roll()
  useEffect(() => {
    if (!spinning || revealKey > 0) return;
    if (prefersReducedMotion()) return;

    setIsAnimating(true);
    setLocked(false);
    setPop(false);
    const w = value != null ? toDigits(value).length : 6;
    setDisplay(Array.from({ length: w }, () => randomDigit()));

    const spinLoop = window.setInterval(() => {
      setDisplay((prev) => prev.map(() => randomDigit()));
    }, SPIN_INTERVAL_MS);

    return () => window.clearInterval(spinLoop);
  }, [spinning, revealKey, value]);

  // Full scramble then lock entire number at once (rngdle-style)
  useEffect(() => {
    if (value == null || revealKey === 0) return;
    if (revealKey === lastRevealKey.current) return;
    lastRevealKey.current = revealKey;

    const digits = toDigits(value);
    const w = digits.length;
    targetRef.current = digits;
    lastSnapValue.current = value;

    const timers: number[] = [];
    let spinLoop = 0;

    const clearAll = () => {
      window.clearInterval(spinLoop);
      for (const id of timers) window.clearTimeout(id);
    };

    if (prefersReducedMotion()) {
      setDisplay([...digits]);
      setIsAnimating(false);
      setLocked(true);
      setPop(false);
      completeRef.current?.();
      return clearAll;
    }

    setIsAnimating(true);
    setLocked(false);
    setPop(false);
    setDisplay(Array.from({ length: w }, () => randomDigit()));

    spinLoop = window.setInterval(() => {
      setDisplay(Array.from({ length: w }, () => randomDigit()));
    }, SPIN_INTERVAL_MS);

    const duration =
      w <= 4 ? SPIN_DURATION_SHORT_MS : SPIN_DURATION_MS;

    timers.push(
      window.setTimeout(() => {
        window.clearInterval(spinLoop);
        setDisplay([...digits]);
        setIsAnimating(false);
        setLocked(true);
        setPop(true);
        timers.push(
          window.setTimeout(() => {
            setPop(false);
            completeRef.current?.();
          }, 280),
        );
      }, duration),
    );

    return clearAll;
  }, [revealKey, value]);

  const settled = locked && !isAnimating;
  const glow =
    settled && rarity
      ? RARITY_GLOW[rarity]
      : isAnimating
        ? 'shadow-[0_0_32px_rgba(255,255,255,0.12)] ring-white/15'
        : 'shadow-sm ring-[var(--outline)]';

  const colorClass =
    settled && rarity
      ? `rarity-${rarity}`
      : isAnimating
        ? 'text-[var(--prose-2)]'
        : 'text-[var(--prose)]';

  return (
    <div
      className={[
        'mono-number relative inline-flex justify-center gap-[0.08em] rounded-2xl border border-transparent bg-[var(--surface)] px-6 py-4 text-5xl font-bold tracking-tight ring-2 transition-[box-shadow,transform,color] duration-300 sm:px-8 sm:py-5 sm:text-7xl',
        glow,
        colorClass,
        pop ? 'scale-[1.04]' : 'scale-100',
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
      {display.map((char, i) => (
        <span
          key={`${display.length}-${i}`}
          className={[
            'inline-block min-w-[0.62em] text-center tabular-nums',
            isAnimating ? 'digit-spin opacity-90' : '',
            pop ? 'digit-settle' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
