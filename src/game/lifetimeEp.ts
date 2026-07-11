import { badgeRarityFromEP } from './rarity.js';
import type { BadgeDef, BadgeHit } from './types.js';

/** EP-scaled milestones (not Journey roll-count × N). */
export const LIFETIME_EP_THRESHOLDS = [
  1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
  2_000_000, 3_000_000, 5_000_000, 7_500_000, 10_000_000, 15_000_000,
  25_000_000, 50_000_000, 75_000_000, 100_000_000, 150_000_000, 250_000_000,
  500_000_000,
] as const;

export type LifetimeEpThreshold = (typeof LIFETIME_EP_THRESHOLDS)[number];

/** Same award magnitudes as Journey by tier index (reward-feel parity). */
const EP_BY_THRESHOLD: Record<LifetimeEpThreshold, number> = {
  1000: 25,
  5000: 50,
  10000: 75,
  25000: 100,
  50000: 250,
  100000: 500,
  250000: 1_000,
  500000: 2_000,
  1000000: 4_000,
  2000000: 5_000,
  3000000: 6_500,
  5000000: 9_000,
  7500000: 12_000,
  10000000: 16_000,
  15000000: 30_000,
  25000000: 40_000,
  50000000: 55_000,
  75000000: 70_000,
  100000000: 95_000,
  150000000: 130_000,
  250000000: 180_000,
  500000000: 250_000,
};

const NAMES: Record<LifetimeEpThreshold, string> = {
  1000: 'Spark',
  5000: 'Ember',
  10000: 'Kindling',
  25000: 'Torch',
  50000: 'Bonfire',
  100000: 'Beacon',
  250000: 'Furnace',
  500000: 'Crucible',
  1000000: 'Megajoule',
  2000000: 'Twin Vault',
  3000000: 'Triple Vault',
  5000000: 'Quintessence',
  7500000: 'Overclock',
  10000000: 'Decamillion',
  15000000: 'Cascade',
  25000000: 'Avalanche',
  50000000: 'Leviathan',
  75000000: 'Colossus',
  100000000: 'Epoch',
  150000000: 'Dynasty',
  250000000: 'Pantheon',
  500000000: 'Absolute Vault',
};

const EMOJI: Record<LifetimeEpThreshold, string> = {
  1000: '✨',
  5000: '🕯️',
  10000: '🔥',
  25000: '🔦',
  50000: '🏕️',
  100000: '📡',
  250000: '🏭',
  500000: '⚗️',
  1000000: '⚡',
  2000000: '🗄️',
  3000000: '🏛️',
  5000000: '💎',
  7500000: '⚙️',
  10000000: '🏆',
  15000000: '🌊',
  25000000: '⛰️',
  50000000: '🐋',
  75000000: '🗿',
  100000000: '⏳',
  150000000: '👑',
  250000000: '🌌',
  500000000: '♾️',
};

function lifetimeEpBadge(threshold: LifetimeEpThreshold): BadgeDef {
  return {
    id: `ep-${threshold}`,
    name: NAMES[threshold],
    description: `Reached ${threshold.toLocaleString()} lifetime EP.`,
    ep: EP_BY_THRESHOLD[threshold],
    family: 'lifetime',
    emoji: EMOJI[threshold],
    /** Custom Grok art under /public/lifetime-ep */
    image: `/lifetime-ep/${threshold}.jpg`,
    matches: () => false,
  };
}

export const LIFETIME_EP_BADGES: BadgeDef[] =
  LIFETIME_EP_THRESHOLDS.map(lifetimeEpBadge);

export function lifetimeEpBadgesForEp(ep: number): BadgeDef[] {
  return LIFETIME_EP_THRESHOLDS.filter((t) => ep >= t).map(lifetimeEpBadge);
}

export function newlyUnlockedLifetimeEp(
  prev: number,
  next: number,
): BadgeDef[] {
  return LIFETIME_EP_THRESHOLDS.filter((t) => prev < t && next >= t).map(
    lifetimeEpBadge,
  );
}

export function lifetimeEpHits(defs: BadgeDef[]): BadgeHit[] {
  return defs.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    ep: b.ep,
    family: b.family,
    emoji: b.emoji,
    highlights: [],
    rarity: badgeRarityFromEP(b.ep),
    ...(b.image ? { image: b.image } : {}),
  }));
}

export function sumLifetimeEpAward(defs: BadgeDef[]): number {
  return defs.reduce((a, b) => a + b.ep, 0);
}
