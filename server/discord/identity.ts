/**
 * Map Discord snowflake → RNGdle user via Better Auth `account` link.
 */
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { account, user } from '../db/schema.js';
import { getEffectiveRankedTier } from '../polar/entitlements.js';
import { tierMeetsMin, type RankedTier } from '../../src/lib/ranked-limits.js';

export type DiscordLinkedUser = {
  userId: string;
  username: string | null;
  name: string;
  rankedTier: RankedTier;
  hasRarePlus: boolean;
};

export async function resolveDiscordUser(
  db: Db,
  discordSnowflake: string,
): Promise<DiscordLinkedUser | null> {
  const [row] = await db
    .select({
      userId: account.userId,
      username: user.username,
      name: user.name,
      role: user.role,
    })
    .from(account)
    .innerJoin(user, eq(user.id, account.userId))
    .where(
      and(
        eq(account.providerId, 'discord'),
        eq(account.accountId, discordSnowflake),
      ),
    )
    .limit(1);
  if (!row) return null;

  const rankedTier = await getEffectiveRankedTier(db, row.userId);
  return {
    userId: row.userId,
    username: row.username?.trim().toLowerCase() || null,
    name: row.name?.trim() || row.username || 'Player',
    rankedTier,
    hasRarePlus: tierMeetsMin(rankedTier, 'rare'),
  };
}

export const SITE_ORIGIN =
  process.env.BETTER_AUTH_URL?.replace(/\/$/, '') ||
  process.env.VITE_APP_URL?.replace(/\/$/, '') ||
  'https://rngdle-unlocked.chron0.tech';
