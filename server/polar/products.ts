/**
 * Ranked Plus Polar product ids (public CAD subs).
 * Env overrides win when set.
 */

import type { RankedTier } from '../../src/lib/ranked-limits.js';

export type PaidRankedTier = Exclude<RankedTier, 'free'>;

const DEFAULT_PRODUCT_IDS: Record<PaidRankedTier, string> = {
  rare: 'aa1bfa37-6c5f-4b68-bed4-e3dc234f9154',
  epic: '5bf21411-bf97-4a6a-aa7d-2d08c0c5d7d8',
  anomaly: 'd988c23d-3d3e-40ae-b68e-5179645b65b6',
};

export function isPaidRankedTier(v: string): v is PaidRankedTier {
  return v === 'rare' || v === 'epic' || v === 'anomaly';
}

export function productIdForTier(tier: PaidRankedTier): string {
  if (tier === 'rare') {
    return process.env.POLAR_PRODUCT_RARE?.trim() || DEFAULT_PRODUCT_IDS.rare;
  }
  if (tier === 'epic') {
    return process.env.POLAR_PRODUCT_EPIC?.trim() || DEFAULT_PRODUCT_IDS.epic;
  }
  return (
    process.env.POLAR_PRODUCT_ANOMALY?.trim() || DEFAULT_PRODUCT_IDS.anomaly
  );
}

/** Player-facing catalog copy (CAD / cosmetics). */
export const RANKED_PLUS_CATALOG: readonly {
  tier: PaidRankedTier;
  label: string;
  rollsPerHour: number;
  priceCad: string;
  cosmetics: string;
}[] = [
  {
    tier: 'rare',
    label: 'Rare',
    rollsPerHour: 120,
    priceCad: 'CA$4.99',
    cosmetics: 'Rare frame + 4 emblems',
  },
  {
    tier: 'epic',
    label: 'Epic',
    rollsPerHour: 150,
    priceCad: 'CA$9.99',
    cosmetics: 'Epic frame + 8 emblems (includes Rare)',
  },
  {
    tier: 'anomaly',
    label: 'Anomaly',
    rollsPerHour: 180,
    priceCad: 'CA$14.99',
    cosmetics: 'Anomaly frame + 12 emblems (includes Rare + Epic)',
  },
] as const;
