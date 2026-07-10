import { eq } from 'drizzle-orm';
import { requireAdmin, writeAdminAudit } from '../../../server/admin.js';
import { rateGuard, readJson } from '../../../server/apiGuards.js';
import {
  arcadeMeta,
  arcadeRunRolls,
  arcadeRuns,
  rolls,
  user,
  userProgress,
} from '../../../server/db/schema.js';
import { createLogger } from '../../../server/logger.js';
import { LIMITS } from '../../../server/rateLimit.js';
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

  const limited = await rateGuard(
    db,
    `user:${adminUser.id}:admin-wipe`,
    LIMITS.adminMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  const parsed = await readJson<{ userId?: string; confirm?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

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
  // Arcade: run_rolls → runs → meta (FK order; run_rolls also cascade from runs)
  await db.delete(arcadeRunRolls).where(eq(arcadeRunRolls.userId, targetId));
  await db.delete(arcadeRuns).where(eq(arcadeRuns.userId, targetId));
  await db.delete(arcadeMeta).where(eq(arcadeMeta.userId, targetId));

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
