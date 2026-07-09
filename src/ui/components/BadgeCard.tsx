import { useEffect, useRef, useState } from 'react';
import type { BadgeHit } from '../../game';
import { formatRollDigits } from '../../game/digits';
import { RARITY_LABELS } from '../../game/rarity';
import {
  FAMILY_PILL,
  RARITY_DIGIT_OFF,
  RARITY_DIGIT_ON,
  RARITY_PILL,
} from '../../lib/badge-theme';
import { FAMILY_ICON, RARITY_ICON } from '../../lib/icons';

/** Delay between cascading badge cards (ms) */
const CASCADE_MS = 220;
/** Slow follow-scroll duration when a new card appears */
const SCROLL_MS = 720;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Ease-out scroll for window (and optional overflow parent) — slower than native smooth. */
function slowScrollElementIntoView(
  el: HTMLElement,
  durationMs: number,
  block: 'start' | 'end' | 'center' = 'end',
): () => void {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  let targetY: number;
  if (block === 'start') {
    targetY = window.scrollY + rect.top - 16;
  } else if (block === 'center') {
    targetY = window.scrollY + rect.top - vh / 2 + rect.height / 2;
  } else {
    // end: leave a little air under the card
    targetY = window.scrollY + rect.bottom - vh + 48;
  }
  const maxY = Math.max(
    0,
    document.documentElement.scrollHeight - vh,
  );
  targetY = Math.max(0, Math.min(maxY, targetY));
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 2) return () => {};

  const start = performance.now();
  let raf = 0;
  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / durationMs);
    // ease-out cubic — gentle settle
    const e = 1 - (1 - t) ** 3;
    window.scrollTo(0, startY + delta * e);
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

export function BadgeCard({
  badge,
  number,
  isNew = false,
  /** Stagger index for cascade-in (0 = first). */
  cascadeIndex = 0,
  animateIn = false,
}: {
  badge: BadgeHit;
  number: number;
  /** First-time codex unlock this roll */
  isNew?: boolean;
  cascadeIndex?: number;
  animateIn?: boolean;
}) {
  const digits = formatRollDigits(number).split('');
  const highlights =
    badge.highlights.length === digits.length
      ? badge.highlights
      : digits.map(() => false);

  const [visible, setVisible] = useState(!animateIn || prefersReducedMotion());

  useEffect(() => {
    if (!animateIn || prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const t = window.setTimeout(
      () => setVisible(true),
      cascadeIndex * CASCADE_MS,
    );
    return () => window.clearTimeout(t);
  }, [animateIn, cascadeIndex, badge.id]);

  return (
    <article
      className={[
        'relative rounded-xl border bg-[var(--surface)] p-3.5 text-left transition-all duration-300 sm:p-4',
        isNew
          ? 'border-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]'
          : 'border-[var(--outline)]',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <span
            className="icon-chip h-7 w-7 ring-1 ring-black/10 dark:ring-white/10 sm:h-8 sm:w-8"
            title={badge.family}
          >
            <img
              src={
                FAMILY_ICON[badge.family] ?? RARITY_ICON[badge.rarity] ?? ''
              }
              alt=""
              aria-hidden
            />
          </span>
          <span className="text-base leading-none sm:text-lg" aria-hidden>
            {badge.emoji}
          </span>
          <h3 className="text-sm font-bold tracking-tight sm:text-base">
            {badge.name}
          </h3>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${RARITY_PILL[badge.rarity]}`}
          >
            {RARITY_LABELS[badge.rarity]}
          </span>
          {isNew && (
            <span
              className="inline-flex items-center rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-sm sm:text-[11px]"
              aria-label="New badge unlock"
            >
              New
            </span>
          )}
          <span
            className={`hidden items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline-flex ${FAMILY_PILL[badge.family].chip}`}
            title={FAMILY_PILL[badge.family].label}
          >
            {FAMILY_PILL[badge.family].label}
          </span>
        </div>
        <span className="mono-number shrink-0 text-sm font-bold text-amber-600 dark:text-amber-400 sm:text-base">
          +{badge.ep.toLocaleString()} EP
        </span>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-[var(--prose-2)] sm:text-sm">
        {badge.description}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1 sm:gap-1.5">
        {digits.map((d, i) => {
          const on = highlights[i];
          return (
            <span
              key={i}
              className={[
                'mono-number flex h-8 w-8 items-center justify-center rounded-md border text-sm font-bold transition-colors sm:h-9 sm:w-9',
                on ? RARITY_DIGIT_ON[badge.rarity] : RARITY_DIGIT_OFF,
                visible && on ? 'digit-chip-pulse' : '',
              ].join(' ')}
              style={
                visible && on
                  ? { animationDelay: `${cascadeIndex * 40 + i * 45}ms` }
                  : undefined
              }
            >
              {d}
            </span>
          );
        })}
      </div>
    </article>
  );
}

export function BadgeBreakdown({
  badges,
  number,
  newBadgeIds,
  /** Cascade cards in (EP total is animated separately from 0 → roll.totalEP) */
  animateCascade = false,
}: {
  badges: BadgeHit[];
  number: number;
  newBadgeIds?: ReadonlySet<string> | readonly string[];
  animateCascade?: boolean;
}) {
  const sorted = [...badges].sort((a, b) => b.ep - a.ep || a.name.localeCompare(b.name));
  const newSet =
    newBadgeIds instanceof Set ? newBadgeIds : new Set(newBadgeIds ?? []);
  const newCount = sorted.filter((b) => newSet.has(b.id)).length;

  const [visibleCount, setVisibleCount] = useState(
    animateCascade && !prefersReducedMotion() ? 0 : sorted.length,
  );
  const lastItemRef = useRef<HTMLLIElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const badgeSig = sorted.map((b) => b.id).join('|');

  useEffect(() => {
    if (!animateCascade || prefersReducedMotion()) {
      setVisibleCount(sorted.length);
      return;
    }

    setVisibleCount(0);
    const timers: number[] = [];
    sorted.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          setVisibleCount(i + 1);
        }, i * CASCADE_MS),
      );
    });
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
    // badgeSig identifies this roll's badge set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateCascade, badgeSig]);

  // Keep the newest cascading badge in view with a slow, controlled scroll
  useEffect(() => {
    if (!animateCascade || visibleCount < 1) return;
    if (prefersReducedMotion()) return;

    let cancelScroll: (() => void) | undefined;
    // Wait a frame so the new card is laid out, then ease the viewport
    const id = window.requestAnimationFrame(() => {
      const el =
        visibleCount === 1
          ? rootRef.current
          : lastItemRef.current;
      if (!el) return;
      cancelScroll = slowScrollElementIntoView(
        el,
        SCROLL_MS,
        visibleCount === 1 ? 'start' : 'end',
      );
    });

    return () => {
      window.cancelAnimationFrame(id);
      cancelScroll?.();
    };
  }, [visibleCount, animateCascade]);

  if (badges.length === 0) {
    return (
      <p className="py-6 text-center text-base text-[var(--prose-2)]">
        No number badges this roll. Still a valid spin.
      </p>
    );
  }

  const shown = sorted.slice(0, Math.max(visibleCount, 0));

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-base font-bold uppercase tracking-wider text-[var(--prose)]">
          Badge breakdown
        </h2>
        <span className="text-sm text-[var(--prose-2)]">
          {animateCascade && visibleCount < sorted.length
            ? `${visibleCount}/${sorted.length}`
            : `${sorted.length} badge${sorted.length === 1 ? '' : 's'} earned`}
          {newCount > 0 ? (
            <span className="ml-1.5 font-semibold text-amber-600 dark:text-amber-400">
              · {newCount} new
            </span>
          ) : null}
        </span>
      </div>
      <ul className="space-y-2.5">
        {shown.map((b, i) => {
          const isLatest = i === shown.length - 1;
          return (
            <li
              key={b.id}
              ref={isLatest ? lastItemRef : undefined}
            >
              <BadgeCard
                badge={b}
                number={number}
                isNew={newSet.has(b.id)}
                cascadeIndex={i}
                animateIn={animateCascade}
              />
            </li>
          );
        })}
      </ul>
      {/* Spacer so the last card can scroll above the fold / bottom nav */}
      {animateCascade && visibleCount > 0 && (
        <div className="h-16 shrink-0" aria-hidden />
      )}
    </div>
  );
}
