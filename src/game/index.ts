export type {
  AppSettings,
  BadgeDef,
  BadgeFamily,
  BadgeHit,
  CollectionEntry,
  RarityTier,
  RollResult,
  ThemeMode,
} from './types';

export { ROLL_MAX, ROLL_RANGE, rollNumber, assertValidRollNumber } from './rng';
export {
  contributeEntropy,
  contributeKeyEntropy,
  contributePointerEntropy,
  mixPoolInto,
} from './entropyPool';
export { rarityFromEP, RARITY_THRESHOLDS } from './rarity';
export { percentileFromEP, topPercentFromPercentile } from './percentile';
export { sumEP } from './score';
export { evaluateBadges, NUMBER_BADGES, badgeById } from './badges';
export { evaluateNumber, performRoll } from './evaluate';
export {
  JOURNEY_THRESHOLDS,
  JOURNEY_BADGES,
  journeyBadgesForCount,
  newlyUnlockedJourney,
  journeyHits,
  sumJourneyEP,
} from './journey';
