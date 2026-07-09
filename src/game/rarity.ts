import type { RarityTier } from './types.js';

/**
 * Full-roll rarity from total EP.
 *
 * Thresholds are calibrated against the live badge catalog (dense stacking):
 * most random 0..1e6 rolls land ~1.5k–8k EP, so low tiers need high bars
 * or trash/common/uncommon never appear. Target shape ~:
 * trash 15–20% · common 20–25% · uncommon 20–25% · rare 15–20% ·
 * epic ~10% · anomaly ~5–7% · mythic ~1%.
 */
export const RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 11_000 },
  { tier: 'anomaly', minEP: 8_000 },
  { tier: 'epic', minEP: 6_500 },
  { tier: 'rare', minEP: 3_500 },
  { tier: 'uncommon', minEP: 2_200 },
  { tier: 'common', minEP: 1_650 },
  { tier: 'trash', minEP: 0 },
];

/** Softer ladder for individual badge chips (single-badge EP, not full roll). */
export const BADGE_RARITY_THRESHOLDS: { tier: RarityTier; minEP: number }[] = [
  { tier: 'mythic', minEP: 8_000 },
  { tier: 'anomaly', minEP: 4_000 },
  { tier: 'epic', minEP: 2_500 },
  { tier: 'rare', minEP: 900 },
  { tier: 'uncommon', minEP: 250 },
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

/** Canonical low→high tier order (single source for sorting/ranking). */
export const RARITY_ORDER: readonly RarityTier[] = [
  'trash',
  'common',
  'uncommon',
  'rare',
  'epic',
  'anomaly',
  'mythic',
];

/** Rank for sorting: trash = 0 … mythic = 6 (-1 never occurs for valid tiers). */
export function rarityRank(tier: RarityTier): number {
  return RARITY_ORDER.indexOf(tier);
}

/** Coerce an untrusted string to a tier (network payloads); default common. */
export function coerceRarity(r: string): RarityTier {
  return (RARITY_ORDER as readonly string[]).includes(r)
    ? (r as RarityTier)
    : 'common';
}
