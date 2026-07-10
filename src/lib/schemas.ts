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
  'journey',
  'secret',
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
});

export const featureRequestStatusSchema = z.enum([
  'submitted',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'declined',
]);

export const featureRequestSubmitSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(2000),
});

export const featureRequestItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  createdAt: isoDateSchema,
  voteCount: z.number(),
  votedByMe: z.boolean(),
  username: z.string().nullable(),
  name: z.string(),
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
