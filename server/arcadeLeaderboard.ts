/**
 * Arcade Mode leaderboard — best single run score (Digits), not EP.
 */

import { desc, eq, isNotNull } from 'drizzle-orm';
import { createAuth } from './auth.js';
import type { Db } from './db/index.js';
import { arcadeMeta, user } from './db/schema.js';
import { createLogger } from './logger.js';

const log = createLogger('arcade-leaderboard');

export type ArcadeLeaderboardEntry = {
  rank: number;
  username: string | null;
  name: string;
  bestRunScore: number;
  totalRunsCompleted: number;
  userId?: string;
};

export async function arcadeLeaderboardResponse(
  db: Db,
  request: Request,
  limitRaw?: number,
): Promise<Response> {
  const limit = Math.min(100, Math.max(1, limitRaw ?? 50));

  let meUserId: string | null = null;
  let meUsername: string | null = null;
  try {
    const auth = createAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      meUserId = session.user.id;
      meUsername = session.user.username ?? null;
      if (!meUsername) {
        const [u] = await db
          .select({ username: user.username })
          .from(user)
          .where(eq(user.id, meUserId))
          .limit(1);
        meUsername = u?.username ?? null;
      }
    }
  } catch {
    /* anonymous ok */
  }

  const rows = await db
    .select({
      userId: arcadeMeta.userId,
      bestRunScore: arcadeMeta.bestRunScore,
      totalRunsCompleted: arcadeMeta.totalRunsCompleted,
      username: user.username,
      name: user.name,
    })
    .from(arcadeMeta)
    .innerJoin(user, eq(user.id, arcadeMeta.userId))
    .where(isNotNull(user.username))
    .orderBy(desc(arcadeMeta.bestRunScore), desc(arcadeMeta.totalRunsCompleted))
    .limit(Math.max(limit, 200));

  const eligible = rows.filter((r) => (r.bestRunScore ?? 0) > 0);
  const entries: ArcadeLeaderboardEntry[] = eligible
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      username: r.username,
      name: r.name,
      bestRunScore: r.bestRunScore,
      totalRunsCompleted: r.totalRunsCompleted,
      userId: r.userId,
    }));

  let me: ArcadeLeaderboardEntry | null = null;
  if (meUserId) {
    const idx = eligible.findIndex((r) => r.userId === meUserId);
    if (idx >= 0) {
      const r = eligible[idx]!;
      me = {
        rank: idx + 1,
        username: r.username,
        name: r.name,
        bestRunScore: r.bestRunScore,
        totalRunsCompleted: r.totalRunsCompleted,
      };
    } else if (meUsername) {
      const [mine] = await db
        .select()
        .from(arcadeMeta)
        .where(eq(arcadeMeta.userId, meUserId))
        .limit(1);
      if (mine && mine.bestRunScore > 0) {
        me = {
          rank: eligible.length + 1,
          username: meUsername,
          name: meUsername,
          bestRunScore: mine.bestRunScore,
          totalRunsCompleted: mine.totalRunsCompleted,
        };
      }
    }
  }

  const publicEntries = entries.map(({ userId: _u, ...rest }) => rest);
  log.info('query', { limit, count: publicEntries.length, hasMe: Boolean(me) });
  return Response.json({
    entries: publicEntries,
    me,
  });
}
