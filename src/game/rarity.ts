import type { RarityTier } from './types';

/** Highest matching minEP wins — used for full roll score. */
export const RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 50_000 },
  { tier: 'anomaly', minEP: 15_000 },
  { tier: 'epic', minEP: 5_000 },
  { tier: 'rare', minEP: 1_500 },
  { tier: 'uncommon', minEP: 400 },
  { tier: 'common', minEP: 50 },
  { tier: 'trash', minEP: 0 },
];

/** Slightly softer ladder for individual badge cards (OG-style chips). */
export const BADGE_RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 12_000 },
  { tier: 'anomaly', minEP: 6_000 },
  { tier: 'epic', minEP: 3_000 },
  { tier: 'rare', minEP: 1_500 },
  { tier: 'uncommon', minEP: 700 },
  { tier: 'common', minEP: 80 },
  { tier: 'trash', minEP: 0 },
];

function fromTable(
  totalEP: number,
  table: { tier: RarityTier; minEP: number }[],
): RarityTier {
  const ep = Math.max(0, totalEP);
  for (const row of table) {
    if (ep >= row.minEP) return row.tier;
  }
  return 'trash';
}

export function rarityFromEP(totalEP: number): RarityTier {
  return fromTable(totalEP, RARITY_THRESHOLDS);
}

export function badgeRarityFromEP(badgeEP: number): RarityTier {
  return fromTable(badgeEP, BADGE_RARITY_THRESHOLDS);
}

export const RARITY_LABELS: Record<RarityTier, string> = {
  trash: 'Trash',
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  anomaly: 'Anomaly',
  mythic: 'Mythic',
};
