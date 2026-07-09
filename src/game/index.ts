export type {
  AppSettings,
  BadgeDef,
  BadgeFamily,
  BadgeHit,
  CollectionEntry,
  ConsecutiveHighlight,
  PlayStats,
  RarityTier,
  RollHighlight,
  RollResult,
  ThemeMode,
} from './types';
export { rollToHighlight } from './types';

export { ROLL_MAX, ROLL_RANGE, rollNumber, assertValidRollNumber } from './rng';
export { DISPLAY_WIDTH, formatRollDigits, naturalDigits } from './digits';
export {
  contributeEntropy,
  contributeKeyEntropy,
  contributePointerEntropy,
  mixPoolInto,
} from './entropyPool';
export {
  rarityFromEP,
  badgeRarityFromEP,
  RARITY_THRESHOLDS,
  RARITY_LABELS,
} from './rarity';
export { percentileFromEP, topPercentFromPercentile } from './percentile';
export { sumEP } from './score';
export { evaluateBadges, NUMBER_BADGES, badgeById } from './badges';
export { evaluateNumber, performRoll, ensureShortCode } from './evaluate';
export {
  makeShortCode,
  newRollId,
  isUuid,
  vanityUserSegment,
} from './ids';
export {
  JOURNEY_THRESHOLDS,
  JOURNEY_BADGES,
  journeyBadgesForCount,
  newlyUnlockedJourney,
  journeyHits,
  sumJourneyEP,
} from './journey';
export {
  applyStreaks,
  recomputeBestConsecutive,
  defaultPlayStats,
  isQualityRarity,
  localDateKey,
} from './stats';
export { playRollSound, shouldCelebrate } from './fx';
export { buildShareText, buildFlavorQuote } from './shareText';
export {
  buildPeriodSeed,
  challengeNumber,
  utcDateKey,
  utcWeekKey,
  type ChallengeInfo,
  type ChallengeKind,
} from './challenge';
export {
  SECRET_BADGES,
  SECTION_SECRETS,
  OMEGA_SECRET,
  SECTION_FAMILIES,
  secretById,
  isSectionComplete,
  sectionProgress,
  newlyUnlockedSecrets,
  secretHits,
  sumSecretEP,
  mergeSecretUnlocks,
  type SecretBadgeDef,
  type SectionFamily,
} from './secrets';

