import { rateGuard } from '../../server/apiGuards.js';
import { arcadeLeaderboardResponse } from '../../server/arcadeLeaderboard.js';
import { createDb } from '../../server/db/index.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { clientIp, LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/leaderboard');

/**
 * GET /api/arcade/leaderboard — best Arcade run score (Digits).
 * Auth optional (me card when signed in).
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const db = createDb();
  const url = requestUrl(request);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50),
  );
  const ip = clientIp(request);

  const limited = await rateGuard(
    db,
    `ip:${ip}:arcade-lb`,
    LIMITS.arcadeLeaderboardPerMinute,
    60_000,
  );
  if (limited) {
    log.warn('rate limited', { ip });
    return limited;
  }

  try {
    return await arcadeLeaderboardResponse(db, request, limit);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('leaderboard failed', { err: message });
    return Response.json({ error: message || 'Failed' }, { status: 500 });
  }
});
