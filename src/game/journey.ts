import type { BadgeDef, BadgeHit } from './types';

export const JOURNEY_THRESHOLDS = [
  5, 10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 10_000,
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
};

function journeyBadge(threshold: JourneyThreshold): BadgeDef {
  return {
    id: `rolls-${threshold}`,
    name: NAMES[threshold],
    description: `Reached ${threshold.toLocaleString()} lifetime rolls`,
    ep: EP_BY_THRESHOLD[threshold],
    family: 'journey',
    matches: () => false, // not number-based
  };
}

export const JOURNEY_BADGES: BadgeDef[] = JOURNEY_THRESHOLDS.map(journeyBadge);

export function journeyBadgesForCount(count: number): BadgeDef[] {
  return JOURNEY_THRESHOLDS.filter((t) => count >= t).map(journeyBadge);
}

/** Badges newly unlocked when count goes from prev → next (exclusive of prev). */
export function newlyUnlockedJourney(prev: number, next: number): BadgeDef[] {
  return JOURNEY_THRESHOLDS.filter((t) => prev < t && next >= t).map(journeyBadge);
}

export function journeyHits(defs: BadgeDef[]): BadgeHit[] {
  return defs.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    ep: b.ep,
    family: b.family,
  }));
}

export function sumJourneyEP(defs: BadgeDef[]): number {
  return defs.reduce((a, b) => a + b.ep, 0);
}
