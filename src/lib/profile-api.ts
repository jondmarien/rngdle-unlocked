import { z } from 'zod';

/**
 * Schemas mirror the payload built in api/profile/[username].ts.
 * `stats` comes from user-synced JSON, so its fields tolerate garbage
 * (`.catch`) instead of failing the whole profile page.
 */

const profileCollectionEntrySchema = z.object({
  badgeId: z.string(),
  family: z.string(),
  firstEarnedAt: z.string(),
});

const profileSecretSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  image: z.string().optional(),
  tier: z.enum(['section', 'omega']),
  section: z.string(),
  ep: z.number(),
  unlocked: z.boolean().optional(),
});

const profileBestRollSchema = z.looseObject({
  id: z.string().optional(),
  number: z.number(),
  totalEP: z.number(),
  rarity: z.string(),
  percentile: z.number().optional(),
  badgeCount: z.number().optional(),
  rolledAt: z.string().optional(),
  topBadges: z.array(z.string()).optional(),
});

const profileStatsSchema = z.looseObject({
  bestRoll: profileBestRollSchema.nullish().catch(undefined),
  bestQualityStreak: z.number().optional().catch(undefined),
  bestDayStreak: z.number().optional().catch(undefined),
});

const profileRecentRollSchema = z.object({
  id: z.string(),
  shortCode: z.string().nullish(),
  number: z.number(),
  totalEP: z.number(),
  rarity: z.string(),
  percentile: z.number().optional(),
  badgeCount: z.number(),
  topBadges: z.array(z.string()).optional(),
  attested: z.boolean().optional(),
  challengeKey: z.string().nullish(),
  rolledAt: z.string(),
});

export const profileSchema = z.object({
  username: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  memberSince: z.string(),
  profileAccent: z.string().optional(),
  profileBio: z.string().optional(),
  profileFlair: z.string().optional(),
  profileAvatar: z.string().optional(),
  profileFrame: z.string().optional(),
  rankedTier: z.enum(['free', 'rare', 'epic', 'anomaly']).optional(),
  /** When false, owner hid public codex (default true). */
  profileShowCodex: z.boolean().optional(),
  lifetimeEP: z.number(),
  lifetimeRollCount: z.number(),
  journeyEP: z.number(),
  badgeCount: z.number(),
  /** Server classification of progress ownership. */
  progressProvenance: z
    .enum(['cloud_sync', 'cloned_local', 'local_progress', 'unknown'])
    .optional(),
  progressProvenanceLabel: z.string().optional(),
  collection: z.array(profileCollectionEntrySchema).optional(),
  secrets: z.array(profileSecretSchema).optional(),
  stats: profileStatsSchema,
  recentRolls: z.array(profileRecentRollSchema),
});

export type Profile = z.infer<typeof profileSchema>;
export type ProfileCollectionEntry = z.infer<
  typeof profileCollectionEntrySchema
>;
export type ProfileSecret = z.infer<typeof profileSecretSchema>;
export type ProfileBestRoll = z.infer<typeof profileBestRollSchema>;
export type ProfileRecentRoll = z.infer<typeof profileRecentRollSchema>;

/** GET /api/profile/:username — throws with the server error on failure. */
export async function fetchProfile(username: string): Promise<Profile> {
  const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
  const data = (await res.json()) as { error?: string; profile?: unknown };
  if (!res.ok) throw new Error(data.error ?? 'Not found');
  const parsed = profileSchema.safeParse(data.profile);
  // Parse failure funnels into the SAME error path as a 404 (single catch
  // in ProfileScreen) — generic message, not zod internals.
  if (!parsed.success) throw new Error('Invalid profile data');
  return parsed.data;
}
