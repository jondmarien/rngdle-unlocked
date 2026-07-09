import { eq } from 'drizzle-orm';
import { createAuth } from '../../../server/auth.js';
import { requireAdmin, writeAdminAudit } from '../../../server/admin.js';
import { rateGuard, readJson } from '../../../server/apiGuards.js';
import { user } from '../../../server/db/schema.js';
import { createLogger } from '../../../server/logger.js';
import { LIMITS } from '../../../server/rateLimit.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const log = createLogger('api/admin/users/ban');

/**
 * POST — ban or unban a user (revokes sessions on ban via Better Auth admin API when available).
 * Body: { userId, banned: boolean, reason?: string }
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db, user: adminUser, ip } = gate;

  const limited = await rateGuard(
    db,
    `user:${adminUser.id}:admin-ban`,
    LIMITS.adminMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  const parsed = await readJson<{
    userId?: string;
    banned?: boolean;
    reason?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const targetId = body.userId?.trim();
  if (!targetId || typeof body.banned !== 'boolean') {
    return Response.json(
      { error: 'userId and banned (boolean) required' },
      { status: 400 },
    );
  }

  if (targetId === adminUser.id) {
    return Response.json({ error: 'Cannot ban yourself' }, { status: 400 });
  }

  const [target] = await db
    .select({ id: user.id, role: user.role, username: user.username })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1);

  if (!target) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.role === 'admin') {
    return Response.json(
      { error: 'Refusing to ban an admin account' },
      { status: 403 },
    );
  }

  const reason = body.reason?.trim().slice(0, 500) || null;

  if (body.banned) {
    const auth = createAuth();
    try {
      await auth.api.banUser({
        body: {
          userId: targetId,
          banReason: reason ?? 'Banned by admin',
        },
        headers: request.headers,
      });
    } catch (e) {
      // Fallback: direct column update if plugin API fails
      log.warn('banUser API failed, falling back to columns', {
        message: e instanceof Error ? e.message : String(e),
      });
      await db
        .update(user)
        .set({
          banned: true,
          banReason: reason ?? 'Banned by admin',
          updatedAt: new Date(),
        })
        .where(eq(user.id, targetId));
    }
  } else {
    const auth = createAuth();
    try {
      await auth.api.unbanUser({
        body: { userId: targetId },
        headers: request.headers,
      });
    } catch (e) {
      log.warn('unbanUser API failed, falling back to columns', {
        message: e instanceof Error ? e.message : String(e),
      });
      await db
        .update(user)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, targetId));
    }
  }

  await writeAdminAudit(db, {
    actorUserId: adminUser.id,
    action: body.banned ? 'ban' : 'unban',
    targetType: 'user',
    targetId,
    meta: { username: target.username, reason },
    ip,
  });

  log.info(body.banned ? 'ban' : 'unban', { targetId, by: adminUser.id });
  return Response.json({ ok: true });
});
