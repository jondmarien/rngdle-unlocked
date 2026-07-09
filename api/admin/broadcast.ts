import { desc } from 'drizzle-orm';
import { requireAdmin, writeAdminAudit } from '../../server/admin.js';
import { systemMessages } from '../../server/db/schema.js';
import { createLogger } from '../../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/admin/broadcast');

/**
 * Admin system broadcasts (session + role=admin).
 * Replaces secret-header POST on /api/system-messages for day-to-day use.
 */
export default defineHandler(async (request) => {
  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db, user: adminUser, ip } = gate;

  if (request.method === 'GET') {
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
    const rl = await checkRateLimit(
      db,
      `user:${adminUser.id}:admin-broadcast`,
      LIMITS.adminMutatePerMinute,
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
      meta: { title: title.slice(0, 40) },
      ip,
    });

    log.info('broadcast', { id, title: title.slice(0, 40), by: adminUser.id });
    return Response.json({ ok: true, id });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
