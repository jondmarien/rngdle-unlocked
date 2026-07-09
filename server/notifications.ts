import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from './db/index.js';
import {
  notifications,
  systemMessageReads,
  systemMessages,
  user,
} from './db/schema.js';
import { createLogger } from './logger.js';

const log = createLogger('notifications');

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

export function newNotificationId(): string {
  return crypto.randomUUID();
}

export async function createNotification(
  db: Db,
  opts: {
    /** Optional stable id for idempotent unlocks (e.g. unlock-user-badgeId). */
    id?: string;
    userId: string;
    kind: string;
    title: string;
    body?: string;
    href?: string | null;
    actorUsername?: string | null;
  },
): Promise<void> {
  await db.insert(notifications).values({
    id: opts.id ?? newNotificationId(),
    userId: opts.userId,
    kind: opts.kind,
    title: opts.title,
    body: opts.body ?? '',
    href: opts.href ?? null,
    actorUsername: opts.actorUsername ?? null,
  });
}

/** Notify target that `actorUsername` followed them. */
export async function notifyFollow(
  db: Db,
  opts: {
    targetUserId: string;
    actorUserId: string;
    actorUsername: string | null;
  },
): Promise<void> {
  let handle = opts.actorUsername?.trim().toLowerCase() || null;
  if (!handle) {
    const [row] = await db
      .select({ username: user.username, name: user.name })
      .from(user)
      .where(eq(user.id, opts.actorUserId))
      .limit(1);
    handle = row?.username ?? null;
    const label = handle ? `@${handle}` : row?.name || 'Someone';
    await createNotification(db, {
      userId: opts.targetUserId,
      kind: 'follow',
      title: `${label} followed you`,
      body: 'You have a new follower on RNGdle Unlocked.',
      href: handle ? `/u/${encodeURIComponent(handle)}` : null,
      actorUsername: handle,
    });
    return;
  }
  await createNotification(db, {
    userId: opts.targetUserId,
    kind: 'follow',
    title: `@${handle} followed you`,
    body: 'You have a new follower on RNGdle Unlocked.',
    href: `/u/${encodeURIComponent(handle)}`,
    actorUsername: handle,
  });
}

/** GET inbox assembly (moved verbatim from api/notifications.ts). */
export async function inboxResponse(db: Db, userId: string): Promise<Response> {
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

/** PATCH mark-read (per-tab, markAll, per-id) — moved verbatim. */
export async function markReadResponse(
  db: Db,
  userId: string,
  body: {
    ids?: string[];
    markAll?: boolean;
    tab?: 'activity' | 'system' | 'all';
  },
): Promise<Response> {
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
      const allSys = await db
        .select({ id: systemMessages.id })
        .from(systemMessages);
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
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
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

/** Pull path from "Open: /s/…" (or any absolute-path) in system message body. */
function extractOpenHref(body: string): string | null {
  const m = body.match(/Open:\s*(\/[^\s]+)/i);
  if (!m?.[1]) return null;
  // Only allow same-origin relative paths
  const path = m[1];
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  return path;
}
