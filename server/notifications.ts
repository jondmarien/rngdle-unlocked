import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { notifications, user } from './db/schema.js';

export function newNotificationId(): string {
  return crypto.randomUUID();
}

export async function createNotification(
  db: Db,
  opts: {
    userId: string;
    kind: string;
    title: string;
    body?: string;
    href?: string | null;
    actorUsername?: string | null;
  },
): Promise<void> {
  await db.insert(notifications).values({
    id: newNotificationId(),
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
