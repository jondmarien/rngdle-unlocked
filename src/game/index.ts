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
} from './types.js';
export { rollToHighlight } from './types.js';

export {
  ROLL_MAX,
  ROLL_RANGE,
  CEILING_JACKPOT_ODDS,
  rollNumber,
  assertValidRollNumber,
} from './rng.js';
export { DISPLAY_WIDTH, formatRollDigits, naturalDigits } from './digits.js';
export {
  contributeEntropy,
  contributeKeyEntropy,
  contributePointerEntropy,
  mixPoolInto,
} from './entropyPool.js';
export {
  rarityFromEP,
  badgeRarityFromEP,
  coerceRarity,
  rarityRank,
  RARITY_ORDER,
  RARITY_THRESHOLDS,
  BADGE_RARITY_THRESHOLDS,
  RARITY_LABELS,
} from './rarity.js';
export {
  percentileFromEP,
  topPercentFromPercentile,
  topPercentFromEP,
} from './percentile.js';
export { sumEP } from './score.js';
export { evaluateBadges, NUMBER_BADGES, badgeById } from './badges/index.js';
export { evaluateNumber, performRoll, ensureShortCode } from './evaluate.js';
export { makeShortCode, newRollId, isUuid, vanityUserSegment } from './ids.js';
export {
  JOURNEY_THRESHOLDS,
  JOURNEY_BADGES,
  journeyBadgesForCount,
  newlyUnlockedJourney,
  journeyHits,
  sumJourneyEP,
} from './journey.js';
export {
  applyStreaks,
  recomputeBestConsecutive,
  recomputeParityStreaks,
  finalizeStatsFromHistory,
  giantNumbersHit,
  defaultPlayStats,
  isQualityRarity,
  localDateKey,
} from './stats.js';
export {
  playRollSound,
  shouldCelebrate,
  shouldTrashCrack,
  celebrateIntensity,
} from './fx.js';
export { buildShareText, buildFlavorQuote } from './shareText.js';
export {
  buildPeriodSeed,
  challengeKeyForPeriod,
  challengeNumber,
  findChallengeRollForPeriod,
  utcDateKey,
  utcWeekKey,
  type ChallengeInfo,
  type ChallengeKind,
} from './challenge.js';
export {
  SECRET_BADGES,
  SECTION_SECRETS,
  OMEGA_SECRET,
  SECTION_FAMILIES,
  secretById,
  isSectionComplete,
  sectionProgress,
  newlyUnlockedSecrets,
  evaluateOwnedSecrets,
  secretHits,
  sumSecretEP,
  mergeSecretUnlocks,
  type SecretBadgeDef,
  type SectionFamily,
} from './secrets.js';
export {
  STREAK_SECRETS,
  newlyUnlockedStreakSecrets,
  mergeStreakUnlocks,
  streakSecretHits,
  sumStreakSecretEP,
} from './streakSecrets.js';
