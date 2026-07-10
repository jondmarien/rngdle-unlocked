import { eq } from 'drizzle-orm';
import { requireAdmin, writeAdminAudit } from '../../../server/admin.js';
import { rateGuard, readJson } from '../../../server/apiGuards.js';
import { user } from '../../../server/db/schema.js';
import { createLogger } from '../../../server/logger.js';
import { LIMITS } from '../../../server/rateLimit.js';
import {
  isValidUsername,
  normalizeUsername,
} from '../../../server/username.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const log = createLogger('api/admin/users/username');

/**
 * POST — set or change a user's public @username (admin).
 * Body: { userId, username }
 *
 * Same validation as PATCH /api/me. Needed when OAuth users never claimed a
 * handle (username null → leaderboards exclude them; admin UI shows `name`).
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
    `user:${adminUser.id}:admin-username`,
    LIMITS.adminMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  const parsed = await readJson<{ userId?: string; username?: string }>(
    request,
  );
  if (!parsed.ok) return parsed.response;

  const targetId = parsed.body.userId?.trim();
  const username = normalizeUsername(parsed.body.username ?? '');
  if (!targetId || !username) {
    return Response.json(
      { error: 'userId and username required' },
      { status: 400 },
    );
  }
  if (!isValidUsername(username)) {
    return Response.json(
      { error: 'Username must be 3–24 chars: a-z, 0-9, _' },
      { status: 400 },
    );
  }

  const [target] = await db
    .select({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, targetId))
    .limit(1);

  if (!target) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.username === username) {
    return Response.json({ ok: true, username, unchanged: true });
  }

  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (taken && taken.id !== targetId) {
    return Response.json(
      { error: `@${username} is already taken` },
      { status: 409 },
    );
  }

  await db
    .update(user)
    .set({ username, updatedAt: new Date() })
    .where(eq(user.id, targetId));

  await writeAdminAudit(db, {
    actorUserId: adminUser.id,
    action: 'set_username',
    targetType: 'user',
    targetId,
    meta: {
      previous: target.username,
      username,
      email: target.email,
      name: target.name,
    },
    ip,
  });

  log.info('username set', {
    targetId,
    previous: target.username,
    username,
    by: adminUser.id,
  });
  return Response.json({ ok: true, username });
});
