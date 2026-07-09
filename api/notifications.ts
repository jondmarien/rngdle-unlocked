import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import {
  inboxResponse,
  markReadResponse,
  type InboxItem,
} from '../server/notifications.js';
import { LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

export type { InboxItem };

/**
 * GET — inbox (activity + system)
 * PATCH { ids?: string[], markAll?: boolean, tab?: 'activity'|'system' } — mark read
 * Assembly / mark-read logic lives in server/notifications.ts.
 */
export default defineHandler(async (request) => {
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const userId = gate.user.id;

  const db = createDb();
  const limited = await rateGuard(
    db,
    `user:${userId}:notifications`,
    LIMITS.notificationsPerMinute,
    60_000,
  );
  if (limited) return limited;

  if (request.method === 'GET') {
    return inboxResponse(db, userId);
  }

  if (request.method === 'PATCH') {
    const parsed = await readJson<{
      ids?: string[];
      markAll?: boolean;
      tab?: 'activity' | 'system' | 'all';
    }>(request);
    if (!parsed.ok) return parsed.response;
    return markReadResponse(db, userId, parsed.body);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
