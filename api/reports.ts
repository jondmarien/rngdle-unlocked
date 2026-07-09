import { eq } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { user, userReports } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
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

  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createDb();
  const ip = clientIp(request);
  const rl = await checkRateLimit(
    db,
    `user:${session.user.id}:report`,
    LIMITS.reportPerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  let body: {
    targetUserId?: string;
    targetUsername?: string;
    reason?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

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

  if (targetId === session.user.id) {
    return Response.json({ error: 'Cannot report yourself' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(userReports).values({
    id,
    reporterId: session.user.id,
    targetUserId: targetId,
    reason: reason.slice(0, 2000),
    status: 'open',
  });

  log.info('report filed', {
    id,
    reporter: session.user.id,
    target: targetId,
    ip,
  });

  return Response.json({ ok: true, id });
});
