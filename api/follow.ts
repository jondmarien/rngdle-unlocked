import { and, eq } from 'drizzle-orm';
import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { follows, user, userProgress } from '../server/db/schema.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import { notifyFollow } from '../server/notifications.js';
import { LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/follow');

/**
 * Follow / unfollow / list (feature 2).
 * POST { username } — follow
 * DELETE ?username= — unfollow
 * GET — list who I follow (includes additive profile + lifetime EP fields)
 */
export default defineHandler(async (request) => {
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;

  const db = createDb();
  const limited = await rateGuard(
    db,
    `user:${me.id}:follow`,
    LIMITS.followPerMinute,
    60_000,
  );
  if (limited) return limited;

  if (request.method === 'GET') {
    const rows = await db
      .select({
        username: user.username,
        name: user.name,
        followingId: follows.followingId,
        createdAt: follows.createdAt,
        profileAvatar: user.profileAvatar,
        profileFlair: user.profileFlair,
        profileAccent: user.profileAccent,
        image: user.image,
        lifetimeEp: userProgress.lifetimeEp,
      })
      .from(follows)
      .innerJoin(user, eq(user.id, follows.followingId))
      .leftJoin(userProgress, eq(userProgress.userId, follows.followingId))
      .where(eq(follows.followerId, me.id));

    return Response.json({
      following: rows.map((r) => ({
        username: r.username,
        name: r.name,
        userId: r.followingId,
        since: r.createdAt.toISOString(),
        profileAvatar: r.profileAvatar || null,
        profileFlair: r.profileFlair || null,
        profileAccent: r.profileAccent || null,
        image: r.image ?? null,
        lifetimeEP: r.lifetimeEp ?? 0,
      })),
    });
  }

  if (request.method === 'POST') {
    const parsed = await readJson<{ username?: string }>(request);
    if (!parsed.ok) return parsed.response;
    const username = parsed.body.username?.trim().toLowerCase();
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
    if (target.id === me.id) {
      return Response.json(
        { error: 'Cannot follow yourself' },
        { status: 400 },
      );
    }

    const actorUsername = me.username ?? null;

    let created = false;
    try {
      await db.insert(follows).values({
        followerId: me.id,
        followingId: target.id,
      });
      created = true;
    } catch {
      // already following
    }

    if (created) {
      try {
        await notifyFollow(db, {
          targetUserId: target.id,
          actorUserId: me.id,
          actorUsername,
        });
      } catch (e) {
        log.warn('notify follow failed', {
          err: e instanceof Error ? e.message : String(e),
        });
      }
    }

    log.info('follow', {
      from: me.id,
      to: target.id,
      username,
      created,
    });
    return Response.json({ ok: true, following: username, created });
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
        and(eq(follows.followerId, me.id), eq(follows.followingId, target.id)),
      );
    log.info('unfollow', { from: me.id, username });
    return Response.json({ ok: true, unfollowed: username });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
