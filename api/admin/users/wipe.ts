import { eq } from 'drizzle-orm';
import { requireAdmin, writeAdminAudit } from '../../../server/admin.js';
import { rolls, user, userProgress } from '../../../server/db/schema.js';
import { createLogger } from '../../../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../../../server/rateLimit.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const log = createLogger('api/admin/users/wipe');

/**
 * POST — clear cloud progress + rolls for a user (keeps auth identity).
 * Body: { userId: string, confirm: "wipe" }
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db, user: adminUser, ip } = gate;

  const rl = await checkRateLimit(
    db,
    `user:${adminUser.id}:admin-wipe`,
    LIMITS.adminMutatePerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  let body: { userId?: string; confirm?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const targetId = body.userId?.trim();
  if (!targetId || body.confirm !== 'wipe') {
    return Response.json(
      { error: 'userId and confirm:"wipe" required' },
      { status: 400 },
    );
  }

  if (targetId === adminUser.id) {
    return Response.json(
      { error: 'Cannot wipe your own account via admin wipe' },
      { status: 400 },
    );
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
      { error: 'Refusing to wipe an admin account' },
      { status: 403 },
    );
  }

  await db.delete(rolls).where(eq(rolls.userId, targetId));
  await db.delete(userProgress).where(eq(userProgress.userId, targetId));

  await writeAdminAudit(db, {
    actorUserId: adminUser.id,
    action: 'wipe_progress',
    targetType: 'user',
    targetId,
    meta: { username: target.username },
    ip,
  });

  log.info('wipe', { targetId, by: adminUser.id });
  return Response.json({ ok: true });
});
