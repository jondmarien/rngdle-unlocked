import { and, desc, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { follows, rolls, user } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/feed');

const RARE_PLUS = ['rare', 'epic', 'anomaly', 'mythic'] as const;

/**
 * Activity feed of rare+ public rolls from people you follow (feature 2).
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createDb();
  const rl = await checkRateLimit(
    db,
    `user:${session.user.id}:feed`,
    LIMITS.feedPerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  const following = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, session.user.id));

  if (following.length === 0) {
    return Response.json({ items: [], message: 'Follow players to see rare rolls.' });
  }

  const ids = following.map((f) => f.id);
  const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: rolls.id,
      shortCode: rolls.shortCode,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      rolledAt: rolls.rolledAt,
      username: user.username,
      name: user.name,
      attestationSeal: rolls.attestationSeal,
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(
      and(
        inArray(rolls.userId, ids),
        eq(rolls.isPublic, true),
        gte(rolls.rolledAt, weekAgo),
        isNotNull(user.username),
      ),
    )
    .orderBy(desc(rolls.rolledAt))
    .limit(80);

  const items = rows
    .filter((r) =>
      (RARE_PLUS as readonly string[]).includes(String(r.rarity).toLowerCase()),
    )
    .slice(0, 50)
    .map((r) => ({
      id: r.id,
      shortCode: r.shortCode,
      number: r.number,
      totalEP: r.totalEp,
      rarity: r.rarity,
      rolledAt: r.rolledAt.toISOString(),
      username: r.username,
      name: r.name,
      attested: Boolean(r.attestationSeal),
    }));

  log.info('ok', { userId: session.user.id, count: items.length });
  return Response.json({ items });
});
