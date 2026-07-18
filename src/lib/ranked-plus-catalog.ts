/**
 * Player-facing Ranked Plus product copy (mirrors Polar CAD SKUs).
 */

import type { RankedTier } from './ranked-limits';

export type PaidRankedTier = Exclude<RankedTier, 'free'>;

export const RANKED_PLUS_CATALOG: readonly {
  tier: PaidRankedTier;
  label: string;
  rollsPerHour: number;
  priceCad: string;
  cosmetics: string;
  borderClass: string;
  chipClass: string;
}[] = [
  {
    tier: 'rare',
    label: 'Rare',
    rollsPerHour: 120,
    priceCad: 'CA$4.99',
    cosmetics: 'Rare frame + 4 emblems',
    borderClass: 'border-[color-mix(in_srgb,var(--rare)_55%,transparent)]',
    chipClass:
      'border-[color-mix(in_srgb,var(--rare)_45%,transparent)] bg-[color-mix(in_srgb,var(--rare)_12%,transparent)] text-[color-mix(in_srgb,var(--rare)_90%,white)]',
  },
  {
    tier: 'epic',
    label: 'Epic',
    rollsPerHour: 150,
    priceCad: 'CA$9.99',
    cosmetics: 'Epic frame + 8 emblems (includes Rare)',
    borderClass: 'border-[color-mix(in_srgb,var(--epic)_55%,transparent)]',
    chipClass:
      'border-[color-mix(in_srgb,var(--epic)_45%,transparent)] bg-[color-mix(in_srgb,var(--epic)_12%,transparent)] text-[color-mix(in_srgb,var(--epic)_90%,white)]',
  },
  {
    tier: 'anomaly',
    label: 'Anomaly',
    rollsPerHour: 180,
    priceCad: 'CA$14.99',
    cosmetics: 'Anomaly frame + 12 emblems (includes Rare + Epic)',
    borderClass: 'border-[color-mix(in_srgb,var(--anomaly)_55%,transparent)]',
    chipClass:
      'border-[color-mix(in_srgb,var(--anomaly)_45%,transparent)] bg-[color-mix(in_srgb,var(--anomaly)_12%,transparent)] text-[color-mix(in_srgb,var(--anomaly)_90%,white)]',
  },
] as const;

export function tierChipClass(tier: RankedTier): string {
  if (tier === 'free') {
    return 'border-(--outline) bg-(--surface) text-(--prose-2)';
  }
  return (
    RANKED_PLUS_CATALOG.find((c) => c.tier === tier)?.chipClass ??
    'border-(--outline) bg-(--surface) text-(--prose-2)'
  );
}

export function paidTierLabel(tier: PaidRankedTier): string {
  return RANKED_PLUS_CATALOG.find((c) => c.tier === tier)?.label ?? tier;
}
