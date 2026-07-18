/**
 * Soft Ranked gameplay cap (UTC hour window).
 * Server `LIMITS.rankedRollsPerHour` and player-facing ~N copy import this.
 * Free baseline; paid tiers raise the per-user effective limit via entitlements.
 */
export const RANKED_ROLLS_PER_HOUR = 90;

/** Paid / free Ranked hourly caps (UTC hour). */
export const RANKED_TIER_CAPS = {
  free: 90,
  rare: 120,
  epic: 150,
  anomaly: 180,
} as const;

export type RankedTier = keyof typeof RANKED_TIER_CAPS;

export function isRankedTier(value: string): value is RankedTier {
  return value in RANKED_TIER_CAPS;
}

export function rankedCapForTier(tier: RankedTier): number {
  return RANKED_TIER_CAPS[tier];
}
