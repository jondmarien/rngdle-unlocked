import { and, desc, eq, isNull } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import {
  notifications,
  systemMessageReads,
  systemMessages,
} from '../server/db/schema.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/notifications');

export type InboxItem = {
  id: string;
  tab: 'activity' | 'system';
  kind: string;
  title: string;
  body: string;
  href: string | null;
  actorUsername: string | null;
  read: boolean;
  createdAt: string;
};

/**
 * GET — inbox (activity + system)
 * PATCH { ids?: string[], markAll?: boolean, tab?: 'activity'|'system' } — mark read
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
    `user:${session.user.id}:notifications`,
    LIMITS.notificationsPerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  const userId = session.user.id;

  if (request.method === 'GET') {
    const personal = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);

    const systems = await db
      .select({
        id: systemMessages.id,
        title: systemMessages.title,
        body: systemMessages.body,
        createdAt: systemMessages.createdAt,
        readAt: systemMessageReads.readAt,
      })
      .from(systemMessages)
      .leftJoin(
        systemMessageReads,
        and(
          eq(systemMessageReads.messageId, systemMessages.id),
          eq(systemMessageReads.userId, userId),
        ),
      )
      .orderBy(desc(systemMessages.createdAt))
      .limit(50);

    const activity: InboxItem[] = personal.map((n) => ({
      id: n.id,
      tab: 'activity',
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      actorUsername: n.actorUsername,
      read: n.readAt != null,
      createdAt:
        n.createdAt instanceof Date
          ? n.createdAt.toISOString()
          : String(n.createdAt),
    }));

    const system: InboxItem[] = systems.map((s) => ({
      id: s.id,
      tab: 'system',
      kind: 'system',
      title: s.title,
      body: s.body,
      // Crown broadcasts embed "Open: /s/user/code" — surface as clickable href
      href: extractOpenHref(s.body),
      actorUsername: null,
      read: s.readAt != null,
      createdAt:
        s.createdAt instanceof Date
          ? s.createdAt.toISOString()
          : String(s.createdAt),
    }));

    const unreadActivity = activity.filter((a) => !a.read).length;
    const unreadSystem = system.filter((s) => !s.read).length;

    log.info('list', {
      userId,
      activity: activity.length,
      system: system.length,
      unread: unreadActivity + unreadSystem,
    });

    return Response.json({
      activity,
      system,
      unread: {
        activity: unreadActivity,
        system: unreadSystem,
        total: unreadActivity + unreadSystem,
      },
    });
  }

  if (request.method === 'PATCH') {
    let body: {
      ids?: string[];
      markAll?: boolean;
      tab?: 'activity' | 'system' | 'all';
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const tab = body.tab ?? 'all';
    const now = new Date();

    if (body.markAll || (body.ids && body.ids.length === 0 && body.markAll)) {
      if (tab === 'activity' || tab === 'all') {
        await db
          .update(notifications)
          .set({ readAt: now })
          .where(
            and(eq(notifications.userId, userId), isNull(notifications.readAt)),
          );
      }
      if (tab === 'system' || tab === 'all') {
        const allSys = await db.select({ id: systemMessages.id }).from(systemMessages);
        for (const m of allSys) {
          try {
            await db
              .insert(systemMessageReads)
              .values({ userId, messageId: m.id, readAt: now })
              .onConflictDoNothing();
          } catch {
            /* ignore */
          }
        }
      }
      return Response.json({ ok: true, marked: 'all' });
    }

    const ids = body.ids ?? [];
    if (ids.length === 0) {
      return Response.json({ error: 'ids or markAll required' }, { status: 400 });
    }

    // Activity ids are notification UUIDs; system ids are system_messages ids
    if (tab === 'activity' || tab === 'all') {
      for (const id of ids) {
        await db
          .update(notifications)
          .set({ readAt: now })
          .where(
            and(eq(notifications.id, id), eq(notifications.userId, userId)),
          );
      }
    }
    if (tab === 'system' || tab === 'all') {
      for (const id of ids) {
        try {
          await db
            .insert(systemMessageReads)
            .values({ userId, messageId: id, readAt: now })
            .onConflictDoNothing();
        } catch {
          /* not a system id or already read */
        }
      }
    }

    return Response.json({ ok: true, marked: ids.length });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});

/** Pull path from "Open: /s/…" (or any absolute-path) in system message body. */
function extractOpenHref(body: string): string | null {
  const m = body.match(/Open:\s*(\/[^\s]+)/i);
  if (!m?.[1]) return null;
  // Only allow same-origin relative paths
  const path = m[1];
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}
