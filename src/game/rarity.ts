import type { RarityTier } from './types';

/**
 * Full-roll rarity from total EP.
 * Tuned so a solid multi-badge roll can hit Epic; Anomaly/Mythic stay rare.
 */
export const RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 12_000 },
  { tier: 'anomaly', minEP: 4_500 },
  { tier: 'epic', minEP: 1_800 },
  { tier: 'rare', minEP: 700 },
  { tier: 'uncommon', minEP: 220 },
  { tier: 'common', minEP: 40 },
  { tier: 'trash', minEP: 0 },
];

/** Softer ladder for individual badge chips. */
export const BADGE_RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 8_000 },
  { tier: 'anomaly', minEP: 3_500 },
  { tier: 'epic', minEP: 1_500 },
  { tier: 'rare', minEP: 600 },
  { tier: 'uncommon', minEP: 200 },
  { tier: 'common', minEP: 40 },
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
