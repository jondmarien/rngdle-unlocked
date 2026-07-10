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

/**
 * One cadence for reveal + follow-scroll.
 * Card appears every CASCADE_MS; scroll eases over the same window so it
 * never races ahead of the unlocks.
 */
const CASCADE_MS = 520;
const SCROLL_MS = CASCADE_MS;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Ease-out window scroll — duration matched to badge cascade. */
function slowScrollElementIntoView(
  el: HTMLElement,
  durationMs: number,
  block: 'start' | 'end' | 'center' = 'end',
): () => void {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const margin = 72;

  // Skip if already comfortably on screen (except first pin)
  if (block !== 'start') {
    const fullyVisible = rect.top >= margin * 0.5 && rect.bottom <= vh - margin;
    if (fullyVisible) return () => {};
  }

  let targetY: number;
  if (block === 'start') {
    targetY = window.scrollY + rect.top - 20;
  } else if (block === 'center') {
    targetY = window.scrollY + rect.top - vh / 2 + rect.height / 2;
  } else {
    // Keep newest card in the lower portion of the viewport
    targetY = window.scrollY + rect.bottom - vh + margin;
  }
  const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
  targetY = Math.max(0, Math.min(maxY, targetY));
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 4) return () => {};

  const start = performance.now();
  let raf = 0;
  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / durationMs);
    // ease-in-out: starts gently, no snap
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  /** Kept for call-site compatibility; parent owns cascade timing. */
  cascadeIndex: _cascadeIndex = 0,
  animateIn = false,
}: {
  badge: BadgeHit;
  number: number;
  /** First-time codex unlock this roll */
  isNew?: boolean;
  cascadeIndex?: number;
  animateIn?: boolean;
}) {
  void _cascadeIndex;
  const digits = formatRollDigits(number).split('');
  const highlights =
    badge.highlights.length === digits.length
      ? badge.highlights
      : digits.map(() => false);

  // Parent already staggers mount timing — only a short fade-in here (no re-delay)
  const [visible, setVisible] = useState(!animateIn || prefersReducedMotion());

  useEffect(() => {
    if (!animateIn || prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const t = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(t);
  }, [animateIn, badge.id]);

  const hasArt = Boolean(badge.image);

  return (
    <article
      className={[
        'relative rounded-xl border bg-(--surface) p-3.5 text-left transition-all duration-300 sm:p-4',
        hasArt
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-violet-500/10 to-transparent shadow-[0_0_28px_rgba(251,191,36,0.18)]'
          : isNew
            ? 'border-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]'
            : 'border-(--outline)',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
      {hasArt && (
        <div className="mb-3 flex justify-center sm:float-right sm:mb-2 sm:ml-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.35)] sm:h-28 sm:w-28">
            <img
              src={badge.image}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-center text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
              Ultra rare
            </span>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          {!hasArt && (
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
          )}
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

      <p className="mt-1.5 text-xs leading-relaxed text-(--prose-2) sm:text-sm">
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
                visible && on ? { animationDelay: `${i * 50}ms` } : undefined
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
  /** Follow each cascading card with viewport scroll (Settings → localStorage). */
  autoScroll = true,
}: {
  badges: BadgeHit[];
  number: number;
  newBadgeIds?: ReadonlySet<string> | readonly string[];
  animateCascade?: boolean;
  autoScroll?: boolean;
}) {
  const sorted = [...badges].sort(
    (a, b) => b.ep - a.ep || a.name.localeCompare(b.name),
  );
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

  // Follow-scroll in lockstep with cascade (optional; Settings → autoScrollBadges)
  useEffect(() => {
    if (!autoScroll) return;
    if (!animateCascade || visibleCount < 1) return;
    if (prefersReducedMotion()) return;

    let cancelScroll: (() => void) | undefined;
    // Let the card mount + fade start, then scroll over the rest of CASCADE_MS
    const delay = window.setTimeout(() => {
      const el = visibleCount === 1 ? rootRef.current : lastItemRef.current;
      if (!el) return;
      cancelScroll = slowScrollElementIntoView(
        el,
        Math.max(280, SCROLL_MS - 80),
        visibleCount === 1 ? 'start' : 'end',
      );
    }, 60);

    return () => {
      window.clearTimeout(delay);
      cancelScroll?.();
    };
  }, [visibleCount, animateCascade, autoScroll]);

  if (badges.length === 0) {
    return (
      <p className="py-6 text-center text-base text-(--prose-2)">
        No number badges this roll. Still a valid spin.
      </p>
    );
  }

  const shown = sorted.slice(0, Math.max(visibleCount, 0));

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-base font-bold uppercase tracking-wider text-(--prose)">
          Badge breakdown
        </h2>
        <span className="text-sm text-(--prose-2)">
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
            <li key={b.id} ref={isLatest ? lastItemRef : undefined}>
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
