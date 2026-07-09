import type { BadgeHit, RarityTier } from '../../game';
import { formatRollDigits } from '../../game/digits';
import { RARITY_LABELS } from '../../game/rarity';

const RARITY_CHIP: Record<RarityTier, string> = {
  trash: 'bg-[var(--prose-3)]/20 text-[var(--prose-3)]',
  common: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  uncommon: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  rare: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  epic: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  anomaly: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
  mythic: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

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
          <span className="text-xl leading-none" aria-hidden>
            {badge.emoji}
          </span>
          <h3 className="text-base font-bold tracking-tight">{badge.name}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${RARITY_CHIP[badge.rarity]}`}
          >
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
