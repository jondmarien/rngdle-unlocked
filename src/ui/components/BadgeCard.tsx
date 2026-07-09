import type { BadgeHit } from '../../game';
import { formatRollDigits } from '../../game/digits';
import { RARITY_LABELS } from '../../game/rarity';
import { FAMILY_PILL, RARITY_PILL } from '../../lib/badge-theme';
import { FAMILY_ICON, RARITY_ICON } from '../../lib/icons';

export function BadgeCard({
  badge,
  number,
}: {
  badge: BadgeHit;
  number: number;
}) {
  // Natural digits (same as reel) — real zeros kept, no fake leading pad
  const digits = formatRollDigits(number).split('');
  const highlights =
    badge.highlights.length === digits.length
      ? badge.highlights
      : digits.map(() => false);

  return (
    <article className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className="icon-chip h-8 w-8 ring-1 ring-black/10 dark:ring-white/10"
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
          <span className="text-lg leading-none" aria-hidden>
            {badge.emoji}
          </span>
          <h3 className="text-base font-bold tracking-tight">{badge.name}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${FAMILY_PILL[badge.family].chip}`}
            title={FAMILY_PILL[badge.family].label}
          >
            {FAMILY_PILL[badge.family].label}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${RARITY_PILL[badge.rarity]}`}
          >
            <span className="icon-chip h-3.5 w-3.5">
              <img src={RARITY_ICON[badge.rarity]} alt="" aria-hidden />
            </span>
            {RARITY_LABELS[badge.rarity]}
          </span>
        </div>
        <span className="mono-number shrink-0 text-base font-bold text-amber-700 dark:text-amber-400">
          +{badge.ep.toLocaleString()} EP
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-[var(--prose-2)]">
        {badge.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {digits.map((d, i) => {
          const on = highlights[i];
          return (
            <span
              key={i}
              className={`mono-number flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold ${
                on
                  ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'border-[var(--outline)] bg-[var(--bg)] text-[var(--prose-2)]'
              }`}
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
}: {
  badges: BadgeHit[];
  number: number;
}) {
  if (badges.length === 0) {
    return (
      <p className="py-6 text-center text-base text-[var(--prose-2)]">
        No number badges this roll. Still a valid spin.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-base font-bold text-[var(--prose)]">
          Badge breakdown
        </h2>
        <span className="text-sm text-[var(--prose-2)]">
          {badges.length} badge{badges.length === 1 ? '' : 's'} earned
        </span>
      </div>
      <ul className="space-y-2.5">
        {badges.map((b) => (
          <li key={b.id}>
            <BadgeCard badge={b} number={number} />
          </li>
        ))}
      </ul>
    </div>
  );
}
