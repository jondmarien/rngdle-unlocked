import type { RarityTier } from './types';

/** Highest matching minEP wins. Tunable constants. */
export const RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 50_000 },
  { tier: 'anomaly', minEP: 15_000 },
  { tier: 'epic', minEP: 5_000 },
  { tier: 'rare', minEP: 1_500 },
  { tier: 'uncommon', minEP: 400 },
  { tier: 'common', minEP: 50 },
  { tier: 'trash', minEP: 0 },
];

export function rarityFromEP(totalEP: number): RarityTier {
  const ep = Math.max(0, totalEP);
  for (const row of RARITY_THRESHOLDS) {
    if (ep >= row.minEP) {
      return row.tier;
    }
  }
  return 'trash';
}
