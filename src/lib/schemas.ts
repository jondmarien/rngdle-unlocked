/**
 * Runtime schemas for the app's untrusted boundaries (save import, cloud sync).
 * Imported by both the SPA and serverless code — keep relative imports with
 * `.js` extensions (see AGENTS.md §5.3).
 */

import { z } from 'zod';
import { ROLL_MAX } from '../game/rng.js';

/** Parseable date string (covers ISO timestamps from every app version). */
export const isoDateSchema = z
  .string()
  .refine((s) => Number.isFinite(Date.parse(s)), {
    message: 'Invalid date string',
  });

export const rarityTierSchema = z.enum([
  'trash',
  'common',
  'uncommon',
  'rare',
  'epic',
  'anomaly',
  'mythic',
  'divine',
]);

export const badgeFamilySchema = z.enum([
  'math',
  'pattern',
  'void',
  'cultural',
  'magnitude',
  'sequence',
  'poker',
  'element',
  'bases',
  'journey',
  'secret',
]);

export const badgeEquationSchema = z.union([
  z.object({
    kind: z.literal('product').optional(),
    divisor: z.number(),
    quotient: z.number(),
  }),
  z.object({
    kind: z.literal('power'),
    base: z.number(),
    exponent: z.number(),
  }),
  z.object({
    kind: z.literal('pronic'),
    k: z.number(),
  }),
  z.object({
    kind: z.literal('digitSum'),
    digits: z.array(z.number()),
    total: z.number(),
    compare: z.enum(['eq', 'gte', 'lte']).optional(),
    threshold: z.number().optional(),
  }),
  z.object({
    kind: z.literal('prime'),
    bound: z.number(),
  }),
  z.object({
    kind: z.literal('fibonacci'),
    left: z.number(),
    right: z.number(),
  }),
  z.object({
    kind: z.literal('bookendPrime'),
    digit: z.number(),
  }),
]);

export const badgeHitSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  ep: z.number(),
  family: badgeFamilySchema,
  emoji: z.string(),
  highlights: z.array(z.boolean()),
  rarity: rarityTierSchema,
  image: z.string().optional(),
  equation: badgeEquationSchema.optional(),
});

export const rollResultSchema = z.object({
  id: z.string().min(1),
  shortCode: z.string().optional(),
  number: z.number().int().min(0).max(ROLL_MAX),
  badges: z.array(badgeHitSchema),
  totalEP: z.number(),
  rarity: rarityTierSchema,
  percentile: z.number(),
  rolledAt: isoDateSchema,
  challengeKey: z.string().optional(),
  source: z.enum(['client', 'ranked', 'challenge']).optional(),
  attestationSeal: z.string().optional(),
});

/**
 * Collection entries from old saves may lack `family` / `firstEarnedAt`
 * (backfilled by `storage.backfillCollectionTimestamps` on load) — keep
 * those optional so legacy exports still import.
 */
export const collectionEntrySchema = z.object({
  badgeId: z.string().min(1),
  firstEarnedAt: isoDateSchema.or(z.literal('')).optional(),
  family: badgeFamilySchema.optional(),
});

/** Best-roll leaderboard row (GET /api/leaderboard?view=best). */
export const bestRollLeaderboardEntrySchema = z.object({
  rank: z.number(),
  username: z.string().nullable(),
  name: z.string(),
  number: z.number(),
  totalEP: z.number(),
  rarity: rarityTierSchema.or(z.string()),
  rolledAt: isoDateSchema,
});

export const bestRollLeaderboardResponseSchema = z.object({
  view: z.literal('best'),
  period: z.enum(['all', 'week']),
  sortBy: z.enum(['ep', 'rarity']),
  scope: z.enum(['ranked', 'practice']),
  entries: z.array(bestRollLeaderboardEntrySchema),
  me: bestRollLeaderboardEntrySchema.nullable().optional(),
  friendsOnly: z.literal(true).optional(),
  followingCount: z.number().optional(),
  message: z.string().optional(),
});

/** GET /api/follow — people you follow (additive profile + EP fields). */
export const followingListEntrySchema = z.object({
  username: z.string().nullable(),
  name: z.string(),
  userId: z.string(),
  since: isoDateSchema,
  profileAvatar: z.string().nullable().optional(),
  profileFlair: z.string().nullable().optional(),
  profileAccent: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  lifetimeEP: z.number().optional(),
});

export const followingListResponseSchema = z.object({
  following: z.array(followingListEntrySchema),
});

export const featureRequestStatusSchema = z.enum([
  'submitted',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'declined',
]);

export const featureRequestTagSchema = z.enum([
  'bug_fix',
  'new_feature',
  'change',
  'badge_update',
]);

export const featureRequestSubmitSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(2000),
  tag: featureRequestTagSchema.nullable().optional(),
});

export const featureRequestItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  tag: z.string().nullable().optional(),
  createdAt: isoDateSchema,
  voteCount: z.number(),
  votedByMe: z.boolean(),
  username: z.string().nullable(),
  name: z.string(),
  userId: z.string().optional(),
  isMine: z.boolean().optional(),
});

export const featureRequestEditSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  tag: featureRequestTagSchema.nullable().optional(),
});

export const featureRequestListResponseSchema = z.object({
  items: z.array(featureRequestItemSchema),
  sort: z.enum(['top', 'newest']).optional(),
});

/** Arcade Mode — best-run leaderboard (Digits, not EP). */
export const arcadeLeaderboardEntrySchema = z.object({
  rank: z.number(),
  username: z.string().nullable(),
  name: z.string(),
  bestRunScore: z.number(),
  totalRunsCompleted: z.number(),
});

export const arcadeLeaderboardResponseSchema = z.object({
  entries: z.array(arcadeLeaderboardEntrySchema),
  me: arcadeLeaderboardEntrySchema.nullable().optional(),
});

export const arcadeUpgradeIdSchema = z.enum([
  'floor_raise',
  'rare_amp',
  'epic_surge',
  'combo_chain',
  'badge_magnet',
  'double_or_nothing',
  'reroll',
  'rarity_lock',
  'currency_surge',
  'bonus_spin',
]);

export const arcadeShopOfferSchema = z.object({
  upgradeId: arcadeUpgradeIdSchema,
  price: z.number(),
});

export const arcadeRunSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'cashed', 'busted']),
  digits: z.number(),
  peakDigits: z.number(),
  rollCount: z.number(),
  comboStreak: z.number(),
  ownedUpgrades: z.array(arcadeUpgradeIdSchema),
  cooldowns: z.record(z.string(), z.number()),
  surgeRollsRemaining: z.number(),
  pending: z.object({
    donArmed: z.boolean().optional(),
    rarityLockArmed: z.boolean().optional(),
    skipShopOnce: z.boolean().optional(),
  }),
  shopOffers: z.array(arcadeShopOfferSchema),
  runScore: z.number().nullable(),
  startedAt: isoDateSchema,
  endedAt: isoDateSchema.nullable(),
});

export const arcadeMetaSchema = z.object({
  unlockedUpgrades: z.array(arcadeUpgradeIdSchema),
  totalRunsCompleted: z.number(),
  bestRunScore: z.number(),
  lifetimeDigitsCashed: z.number(),
  newlyUnlocked: z.array(arcadeUpgradeIdSchema).optional(),
});

export const arcadeRollSchema = z.object({
  id: z.string(),
  number: z.number(),
  totalEP: z.number(),
  rarity: rarityTierSchema,
  badges: z.array(badgeHitSchema),
  digitsAwarded: z.number(),
  percentile: z.number(),
  rolledAt: isoDateSchema,
});

/** Ranked gameplay quota (GET /api/ranked-roll/quota + POST ranked-roll). */
export const rankedQuotaSchema = z.object({
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  resetsInSec: z.number().int().positive().nullable(),
  resetAt: isoDateSchema.nullable(),
});

export const rankedQuotaResponseSchema = z.object({
  quota: rankedQuotaSchema,
});

export type RankedQuota = z.infer<typeof rankedQuotaSchema>;
