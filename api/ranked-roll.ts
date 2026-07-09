import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { getUsername, issueRankedRoll } from '../server/rankedRoll.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/ranked-roll');

/**
 * POST /api/ranked-roll
 * Auth + public username required.
 * Server CSPRNG free-play roll that counts for leaderboard / community crowns.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json(
      { error: 'Sign in to play Ranked free play' },
      { status: 401 },
    );
  }

  const db = createDb();
  const userId = session.user.id;

  const rl = await checkRateLimit(
    db,
    `user:${userId}:ranked-roll`,
    LIMITS.rankedRollsPerHour,
    3_600_000,
  );
  if (isRateLimited(rl)) {
    log.warn('rate limited', { userId });
    return rateLimitedResponse(
      rl,
      'Ranked roll rate limit — try again later',
      true,
    );
  }

  const username = await getUsername(db, userId);
  if (!username) {
    return Response.json(
      {
        error:
          'Claim a public @username on Account before Ranked free play (required for the board).',
        code: 'username_required',
      },
      { status: 400 },
    );
  }

  try {
    const roll = await issueRankedRoll(db, { userId });
    return Response.json({ roll });
  } catch (err) {
    log.error('issue failed', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
});
