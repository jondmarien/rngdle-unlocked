import { rateGuard, requireUser } from '../../../server/apiGuards.js';
import { createDb } from '../../../server/db/index.js';
import { upvoteFeatureRequest } from '../../../server/featureRequests.js';
import { requestUrl } from '../../../server/http.js';
import { createLogger } from '../../../server/logger.js';
import { LIMITS } from '../../../server/rateLimit.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const log = createLogger('api/feature-requests/vote');

/**
 * POST /api/feature-requests/:id/vote — upvote (DB unique blocks double vote).
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;

  const url = requestUrl(request);
  const parts = url.pathname.split('/').filter(Boolean);
  // .../feature-requests/:id/vote
  const id = decodeURIComponent(parts[parts.length - 2] ?? '');
  if (!id || id === 'feature-requests') {
    return Response.json(
      { error: 'Missing feature request id' },
      { status: 400 },
    );
  }

  const db = createDb();
  const limited = await rateGuard(
    db,
    `user:${me.id}:feature-vote`,
    LIMITS.featureRequestVotePerMinute,
    60_000,
  );
  if (limited) return limited;

  const result = await upvoteFeatureRequest(db, {
    userId: me.id,
    requestId: id,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  log.info('ok', { id, userId: me.id, voteCount: result.voteCount });
  return Response.json({ ok: true, voteCount: result.voteCount });
});
