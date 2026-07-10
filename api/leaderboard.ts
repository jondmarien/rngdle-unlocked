import { rateGuard, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { requestUrl } from '../server/http.js';
import { leaderboardResponse } from '../server/leaderboard.js';
import { createLogger } from '../server/logger.js';
import { clientIp, LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/leaderboard');

function parseFriendsOnly(raw: string | null): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * GET /api/leaderboard
 * ?view=total|best     (default total — Total EP board)
 * ?scope=ranked|practice  (default ranked)
 * ?period=all|week
 * ?sort=ep|rolls|badges  (total view; badges mainly for practice all-time)
 * ?sortBy=ep|rarity      (best view only)
 * ?friendsOnly=1         (auth required — follow circle + self)
 *
 * Query pipelines live in server/leaderboard.ts.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const started = Date.now();
  try {
    const db = createDb();
    const ip = clientIp(request);
    const limited = await rateGuard(
      db,
      `ip:${ip}:leaderboard`,
      LIMITS.leaderboardPerMinute,
      60_000,
    );
    if (limited) {
      log.warn('rate limited', { ip });
      return limited;
    }

    const url = requestUrl(request);
    const friendsOnly = parseFriendsOnly(url.searchParams.get('friendsOnly'));
    if (friendsOnly) {
      const gate = await requireUser(request);
      if (!gate.ok) return gate.response;
      return await leaderboardResponse(db, request, started, {
        meId: gate.user.id,
      });
    }

    return await leaderboardResponse(db, request, started);
  } catch (err) {
    log.error('handler threw', {
      ms: Date.now() - started,
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
});
