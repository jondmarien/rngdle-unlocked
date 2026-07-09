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
