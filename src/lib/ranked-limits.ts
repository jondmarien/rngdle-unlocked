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

/** Highest paid tier — also the admin complimentary Ranked Plus grant. */
export const HIGHEST_RANKED_TIER: RankedTier = 'anomaly';

export function isRankedTier(value: string): value is RankedTier {
  return value in RANKED_TIER_CAPS;
}

export function rankedCapForTier(tier: RankedTier): number {
  return RANKED_TIER_CAPS[tier];
}

const TIER_RANK: Record<RankedTier, number> = {
  free: 0,
  rare: 1,
  epic: 2,
  anomaly: 3,
};

/** Cumulative unlock: anomaly ≥ epic ≥ rare ≥ free. */
export function tierMeetsMin(
  userTier: RankedTier,
  minTier: RankedTier,
): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[minTier];
}

/** Numeric rank for Upgrade / Downgrade CTA comparisons. */
export function rankedTierRank(tier: RankedTier): number {
  return TIER_RANK[tier];
}

/** Ranked Plus passive refill interval (6 minutes). */
export const RANKED_REGEN_INTERVAL_MS = 360_000;

/** Rolls restored per tick toward the hour cap (not above it). */
export const RANKED_REGEN_PER_TICK: Record<RankedTier, number> = {
  free: 0,
  rare: 1,
  epic: 2,
  anomaly: 3,
};

export function rankedRegenPerTick(tier: RankedTier): number {
  return RANKED_REGEN_PER_TICK[tier];
}
