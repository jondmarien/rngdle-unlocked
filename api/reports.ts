import { eq } from 'drizzle-orm';
import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { user, userReports } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import { clientIp, LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/reports');

/**
 * POST — signed-in user files an abuse / username report.
 * Body: { targetUserId?: string, targetUsername?: string, reason: string }
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;

  const db = createDb();
  const ip = clientIp(request);
  const limited = await rateGuard(
    db,
    `user:${me.id}:report`,
    LIMITS.reportPerMinute,
    60_000,
  );
  if (limited) return limited;

  const parsed = await readJson<{
    targetUserId?: string;
    targetUsername?: string;
    reason?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const reason = body.reason?.trim();
  if (!reason || reason.length < 8) {
    return Response.json(
      { error: 'reason must be at least 8 characters' },
      { status: 400 },
    );
  }

  let targetId = body.targetUserId?.trim() ?? null;
  if (!targetId && body.targetUsername) {
    const handle = body.targetUsername.trim().toLowerCase().replace(/^@/, '');
    const [row] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, handle))
      .limit(1);
    targetId = row?.id ?? null;
  }

  if (!targetId) {
    return Response.json({ error: 'Target user not found' }, { status: 404 });
  }

  if (targetId === me.id) {
    return Response.json({ error: 'Cannot report yourself' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(userReports).values({
    id,
    reporterId: me.id,
    targetUserId: targetId,
    reason: reason.slice(0, 2000),
    status: 'open',
  });

  log.info('report filed', {
    id,
    reporter: me.id,
    target: targetId,
    ip,
  });

  return Response.json({ ok: true, id });
});
