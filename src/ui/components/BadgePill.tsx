import type { BadgeFamily, BadgeHit, RarityTier } from '../../game';
import { familyPillClass } from '../../lib/badge-theme';

export type BadgePillData = {
  name: string;
  emoji?: string;
  family?: string | null;
  rarity?: string | null;
  ep?: number;
  description?: string;
};

/** Compact colored category chip — family-tinted, rounded, emoji + name. */
export function BadgePill({
  badge,
  showEp = false,
  compact = false,
}: {
  badge: BadgeHit | BadgePillData;
  showEp?: boolean;
  compact?: boolean;
}) {
  const family = 'family' in badge ? badge.family : undefined;
  const chip = familyPillClass(family as BadgeFamily | undefined);
  const emoji = badge.emoji ?? '✦';
  const title =
    'description' in badge && badge.description
      ? `${badge.description}${badge.ep != null ? ` (+${badge.ep.toLocaleString()} EP)` : ''}`
      : badge.ep != null
        ? `+${badge.ep.toLocaleString()} EP`
        : badge.name;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border font-semibold shadow-sm ${chip} ${
        compact
          ? 'px-2 py-0.5 text-[11px] leading-tight'
          : 'px-2.5 py-1 text-xs leading-snug'
      }`}
      title={title}
    >
      <span className="shrink-0 text-[0.95em] leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="truncate tracking-wide">{badge.name}</span>
      {showEp && badge.ep != null && (
        <span className="shrink-0 opacity-70">+{badge.ep.toLocaleString()}</span>
      )}
    </span>
  );
}

/** Rarity-tinted fallback when family is unknown (e.g. raw snippets). */
export function rarityTintedPillClass(rarity?: string | null): string {
  void rarity;
  return familyPillClass(undefined);
}

export type { RarityTier };
