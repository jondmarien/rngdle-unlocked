import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import {
  getRankedRollQuota,
  rankedQuotaRateKey,
} from '../../server/rankedQuota.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/ranked-roll/quota');

/**
 * GET /api/ranked-roll/quota
 * Read-only Ranked gameplay quota (remaining / reset). Does not consume rolls.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request, 'Sign in to view Ranked quota');
  if (!gate.ok) return gate.response;
  const userId = gate.user.id;
  const db = createDb();

  const limited = await rateGuard(
    db,
    rankedQuotaRateKey(userId),
    LIMITS.rankedQuotaPerMinute,
    60_000,
  );
  if (limited) return limited;

  try {
    const quota = await getRankedRollQuota(db, userId);
    return Response.json({ quota });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('quota peek failed', { userId, err: message });
    return Response.json(
      { error: 'Failed to load Ranked quota' },
      { status: 500 },
    );
  }
});
