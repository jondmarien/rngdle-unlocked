import { badgeRarityFromEP } from './rarity.js';
import type { BadgeDef, BadgeHit } from './types.js';

export const JOURNEY_THRESHOLDS = [
  5, 10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 10_000,
  15_000, 20_000, 25_000, 35_000, 50_000, 75_000, 100_000,
] as const;

export type JourneyThreshold = (typeof JOURNEY_THRESHOLDS)[number];

const EP_BY_THRESHOLD: Record<JourneyThreshold, number> = {
  5: 25,
  10: 50,
  15: 75,
  20: 100,
  50: 250,
  100: 500,
  250: 1_000,
  500: 2_000,
  1000: 4_000,
  1500: 5_000,
  2000: 6_500,
  3000: 9_000,
  4000: 12_000,
  5000: 16_000,
  10000: 30_000,
  15000: 40_000,
  20000: 55_000,
  25000: 70_000,
  35000: 95_000,
  50000: 130_000,
  75000: 180_000,
  100000: 250_000,
};

const NAMES: Record<JourneyThreshold, string> = {
  5: 'First Steps',
  10: 'Double Digits',
  15: 'Warming Up',
  20: 'Habit Forming',
  50: 'Regular',
  100: 'Century',
  250: 'Quarter K',
  500: 'Half K',
  1000: 'Grinder',
  1500: 'Deep Grinder',
  2000: 'Two Thousand',
  3000: 'Three K Club',
  4000: 'Four K Club',
  5000: 'Dedicated',
  10000: 'Legend',
  15000: 'Mythic Grinder',
  20000: 'Twenty K',
  25000: 'Quarter Lakh',
  35000: 'Entropy Monk',
  50000: 'Half Hundred K',
  75000: 'Three-Quarter Path',
  100000: 'Centurion',
};

const EMOJI: Record<JourneyThreshold, string> = {
  5: '🌱',
  10: '🔟',
  15: '🔥',
  20: '🎯',
  50: '⭐',
  100: '💯',
  250: '🚀',
  500: '🏅',
  1000: '⚒️',
  1500: '💪',
  2000: '🌋',
  3000: '🏰',
  4000: '👑',
  5000: '💎',
  10000: '🏆',
  15000: '⚔️',
  20000: '🌌',
  25000: '🛸',
  35000: '🧙',
  50000: '🏛️',
  75000: '☄️',
  100000: '♾️',
};

function journeyBadge(threshold: JourneyThreshold): BadgeDef {
  return {
    id: `rolls-${threshold}`,
    name: NAMES[threshold],
    description: `Reached ${threshold.toLocaleString()} lifetime rolls.`,
    ep: EP_BY_THRESHOLD[threshold],
    family: 'journey',
    emoji: EMOJI[threshold],
    matches: () => false,
  };
}

export const JOURNEY_BADGES: BadgeDef[] = JOURNEY_THRESHOLDS.map(journeyBadge);

export function journeyBadgesForCount(count: number): BadgeDef[] {
  return JOURNEY_THRESHOLDS.filter((t) => count >= t).map(journeyBadge);
}

export function newlyUnlockedJourney(prev: number, next: number): BadgeDef[] {
  return JOURNEY_THRESHOLDS.filter((t) => prev < t && next >= t).map(
    journeyBadge,
  );
}

export function journeyHits(defs: BadgeDef[]): BadgeHit[] {
  return defs.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    ep: b.ep,
    family: b.family,
    emoji: b.emoji,
    highlights: [],
    rarity: badgeRarityFromEP(b.ep),
  }));
}

export function sumJourneyEP(defs: BadgeDef[]): number {
  return defs.reduce((a, b) => a + b.ep, 0);
}
