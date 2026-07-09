import { rateGuard, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { feedResponse } from '../server/feed.js';
import { LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

/**
 * GET /api/feed — you + people you follow.
 * Query pipeline lives in server/feed.ts.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;

  const db = createDb();
  const meId = gate.user.id;
  const limited = await rateGuard(
    db,
    `user:${meId}:feed`,
    LIMITS.feedPerMinute,
    60_000,
  );
  if (limited) return limited;

  return feedResponse(db, request, meId);
});
