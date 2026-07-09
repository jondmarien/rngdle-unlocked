import { and, eq } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { follows, user } from '../server/db/schema.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/follow');

/**
 * Follow / unfollow / list (feature 2).
 * POST { username } — follow
 * DELETE ?username= — unfollow
 * GET — list who I follow
 */
export default defineHandler(async (request) => {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createDb();
  const rl = await checkRateLimit(
    db,
    `user:${session.user.id}:follow`,
    LIMITS.followPerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  if (request.method === 'GET') {
    const rows = await db
      .select({
        username: user.username,
        name: user.name,
        followingId: follows.followingId,
        createdAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(user, eq(user.id, follows.followingId))
      .where(eq(follows.followerId, session.user.id));

    return Response.json({
      following: rows.map((r) => ({
        username: r.username,
        name: r.name,
        userId: r.followingId,
        since: r.createdAt.toISOString(),
      })),
    });
  }

  if (request.method === 'POST') {
    let body: { username?: string };
    try {
      body = (await request.json()) as { username?: string };
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const username = body.username?.trim().toLowerCase();
    if (!username) {
      return Response.json({ error: 'username required' }, { status: 400 });
    }
    const [target] = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);
    if (!target) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.id === session.user.id) {
      return Response.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }
    try {
      await db.insert(follows).values({
        followerId: session.user.id,
        followingId: target.id,
      });
    } catch {
      // already following
    }
    log.info('follow', { from: session.user.id, to: target.id, username });
    return Response.json({ ok: true, following: username });
  }

  if (request.method === 'DELETE') {
    const url = requestUrl(request);
    const username = url.searchParams.get('username')?.trim().toLowerCase();
    if (!username) {
      return Response.json({ error: 'username required' }, { status: 400 });
    }
    const [target] = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);
    if (!target) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, session.user.id),
          eq(follows.followingId, target.id),
        ),
      );
    log.info('unfollow', { from: session.user.id, username });
    return Response.json({ ok: true, unfollowed: username });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
