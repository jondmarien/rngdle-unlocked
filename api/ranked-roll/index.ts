import { rateCheckUtcHour, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { rankedRollRateKey } from '../../server/rankedQuota.js';
import { getUsername, issueRankedRoll } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/ranked-roll');

/** Allow cold path for badge catalog + DB write. */
export const config = {
  maxDuration: 30,
};

/**
 * POST /api/ranked-roll
 * Auth + public username required.
 * Server CSPRNG free-play roll that counts for leaderboard / community crowns.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let userIdForLog: string | null = null;
  try {
    const gate = await requireUser(request, 'Sign in to play Ranked free play');
    if (!gate.ok) return gate.response;
    const userId = gate.user.id;
    userIdForLog = userId;

    const db = createDb();

    const limited = await rateCheckUtcHour(
      db,
      rankedRollRateKey(userId),
      LIMITS.rankedRollsPerHour,
      { error: 'Ranked roll rate limit — try again later' },
    );
    if (!limited.ok) {
      log.warn('rate limited', { userId });
      return limited.response;
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

    const roll = await issueRankedRoll(db, { userId });
    return Response.json({ roll, quota: limited.result.quota });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.error('issue failed', { userId: userIdForLog, err: message, stack });
    return Response.json(
      {
        error: message || 'Ranked roll failed',
        // Helpful in client devtools when deploy is broken
        detail: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 },
    );
  }
});
