import { desc } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { systemMessages } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/system-messages');

/**
 * System Messages (developer broadcasts).
 * GET — public list (titles only if logged out? full when signed in via notifications)
 * POST — requires ADMIN_SECRET header `x-admin-secret` or body.adminSecret
 */
export default defineHandler(async (request) => {
  const db = createDb();

  if (request.method === 'GET') {
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
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:system-msg-post`,
      LIMITS.systemMessagePostPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const adminSecret = process.env.ADMIN_SECRET || process.env.SYSTEM_MESSAGE_SECRET;
    if (!adminSecret) {
      return Response.json(
        { error: 'ADMIN_SECRET not configured on server' },
        { status: 503 },
      );
    }

    let body: { title?: string; body?: string; adminSecret?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const provided =
      request.headers.get('x-admin-secret') || body.adminSecret || '';
    if (provided !== adminSecret) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
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

    log.info('broadcast', { id, title: title.slice(0, 40) });
    return Response.json({ ok: true, id });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
