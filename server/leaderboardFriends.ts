import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { follows } from './db/schema.js';

/** Empty-board copy when friends filter is on and the user follows nobody. */
export const FRIENDS_BOARD_EMPTY_MESSAGE =
  'Follow players from Find or Friends to fill this board.';

/**
 * Build the friend-circle user id set: always includes `meId`, plus everyone
 * they follow (deduped). Mirrors feed.ts "always include yourself".
 */
export function friendCircleIds(
  meId: string,
  followingIds: readonly string[],
): string[] {
  return [...new Set<string>([meId, ...followingIds])];
}

/** Load follow targets for `meId` and return the full friend circle (self + following). */
export async function loadFriendCircleIds(
  db: Db,
  meId: string,
): Promise<{ friendIds: string[]; followingCount: number }> {
  const following = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, meId));
  const followingIds = following.map((f) => f.id);
  return {
    friendIds: friendCircleIds(meId, followingIds),
    followingCount: followingIds.length,
  };
}

/** Optional additive fields when `friendsOnly=1` is active. */
export function friendsBoardExtras(followingCount: number): {
  friendsOnly: true;
  followingCount: number;
  message?: string;
} {
  return {
    friendsOnly: true,
    followingCount,
    ...(followingCount === 0 ? { message: FRIENDS_BOARD_EMPTY_MESSAGE } : {}),
  };
}
