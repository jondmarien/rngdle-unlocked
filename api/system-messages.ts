import { desc } from 'drizzle-orm';
import { requireAdmin, writeAdminAudit } from '../server/admin.js';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { systemMessages } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/system-messages');

/**
 * System Messages (developer broadcasts).
 * GET — signed-in users (list)
 * POST — admin session only (role=admin). Secret header auth removed.
 */
export default defineHandler(async (request) => {
  if (request.method === 'GET') {
    const db = createDb();
    const auth = createAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const rows = await db
      .select()
      .from(systemMessages)
      .orderBy(desc(systemMessages.createdAt))
      .limit(50);
    return Response.json({
      messages: rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
      })),
    });
  }

  if (request.method === 'POST') {
    const gate = await requireAdmin(request);
    if (!gate.ok) return gate.response;
    const { db, user: adminUser, ip } = gate;

    const rl = await checkRateLimit(
      db,
      `user:${adminUser.id}:system-msg-post`,
      LIMITS.systemMessagePostPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    let body: { title?: string; body?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const title = body.title?.trim();
    const text = body.body?.trim();
    if (!title || !text) {
      return Response.json(
        { error: 'title and body required' },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    await db.insert(systemMessages).values({
      id,
      title: title.slice(0, 200),
      body: text.slice(0, 8000),
    });

    await writeAdminAudit(db, {
      actorUserId: adminUser.id,
      action: 'broadcast',
      targetType: 'system_message',
      targetId: id,
      meta: { title: title.slice(0, 40), via: 'system-messages' },
      ip,
    });

    log.info('broadcast', { id, title: title.slice(0, 40), by: adminUser.id });
    return Response.json({ ok: true, id });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
