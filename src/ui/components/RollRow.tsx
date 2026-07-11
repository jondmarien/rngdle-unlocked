import type { ReactNode } from 'react';
import type { RarityTier } from '../../game';
import { formatDateTime, formatRelative } from '../../lib/format';
import { FormattedCount } from './FormattedCount';
import { RarityBadge } from './RarityBadge';

export type RollLaneKind = 'free' | 'ranked' | 'challenge';

export function laneFromSource(
  source: string | null | undefined,
): RollLaneKind {
  if (source === 'ranked') return 'ranked';
  if (source === 'challenge') return 'challenge';
  return 'free';
}

/** Colored lane chip — Ranked / Challenge / Free. */
export function RollLaneChip({ lane }: { lane: RollLaneKind }) {
  if (lane === 'ranked') {
    return (
      <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
        Ranked
      </span>
    );
  }
  if (lane === 'challenge') {
    return (
      <span className="rounded border border-(--outline) px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--prose-2)">
        Challenge
      </span>
    );
  }
  return (
    <span className="rounded border border-(--outline) px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--prose-3)">
      Free
    </span>
  );
}

/** Relative time with absolute tooltip (NotificationRow pattern). */
export function RelativeTime({
  iso,
  className = 'text-xs text-(--prose-3)',
}: {
  iso: string;
  className?: string;
}) {
  const absolute = formatDateTime(iso);
  const relative = formatRelative(iso) ?? absolute;
  return (
    <time dateTime={iso} title={absolute} className={className}>
      {relative}
    </time>
  );
}

/**
 * Compact roll meta row: optional lane + rarity + EP + relative time.
 * Used by Feed; History/Profile compose their own layouts with these primitives.
 */
export function RollMetaLine({
  lane,
  rarity,
  totalEP,
  rolledAt,
  attested,
  trailing,
}: {
  lane?: RollLaneKind;
  rarity: RarityTier;
  totalEP: number;
  rolledAt?: string | null;
  attested?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--prose-3)">
      {lane && <RollLaneChip lane={lane} />}
      <RarityBadge rarity={rarity} />
      <span className="font-semibold text-amber-700 dark:text-amber-400">
        <FormattedCount value={totalEP} /> EP
      </span>
      {rolledAt ? <RelativeTime iso={rolledAt} /> : null}
      {attested ? (
        <span className="rounded-full border border-(--outline) px-1.5 py-0.5 text-[10px] font-semibold">
          Sealed
        </span>
      ) : null}
      {trailing}
    </div>
  );
}
