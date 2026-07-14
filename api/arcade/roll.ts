import { rateGuard, readJson, requireUser } from '../../server/apiGuards.js';
import { isArcadeRollCount, processArcadeRoll } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS, peekRateLimit } from '../../server/rateLimit.js';
import { getUsername } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/roll');

export const config = {
  maxDuration: 30,
};

/**
 * POST /api/arcade/roll — body `{ useReroll?: boolean; count?: 1|2|5|10|15 }`
 * Rate limit charges `count` toward the hourly Arcade budget.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request, 'Sign in to play Arcade Mode');
  if (!gate.ok) return gate.response;
  const userId = gate.user.id;
  const db = createDb();

  const username = await getUsername(db, userId);
  if (!username) {
    return Response.json(
      { error: 'Username required', code: 'username_required' },
      { status: 400 },
    );
  }

  let useReroll = false;
  let count = 1;
  if (request.headers.get('content-type')?.includes('application/json')) {
    const parsed = await readJson<{ useReroll?: boolean; count?: number }>(
      request,
    );
    if (parsed.ok) {
      useReroll = Boolean(parsed.body.useReroll);
      if (parsed.body.count !== undefined) {
        if (
          typeof parsed.body.count !== 'number' ||
          !isArcadeRollCount(parsed.body.count)
        ) {
          return Response.json(
            {
              error: 'Invalid roll count (use 1, 2, 5, 10, or 15)',
              code: 'invalid_count',
            },
            { status: 400 },
          );
        }
        count = parsed.body.count;
      }
    }
  }

  const rlKey = `user:${userId}:arcade-roll`;
  const peek = await peekRateLimit(
    db,
    rlKey,
    LIMITS.arcadeRollsPerHour,
    3_600_000,
  );
  if (peek.remaining < count) {
    return Response.json(
      {
        error: 'Arcade roll rate limit — try again later',
        retryAfterSec: peek.resetsInSec ?? 1,
        quota: peek,
      },
      { status: 429 },
    );
  }
  for (let i = 0; i < count; i++) {
    const limited = await rateGuard(
      db,
      rlKey,
      LIMITS.arcadeRollsPerHour,
      3_600_000,
      { error: 'Arcade roll rate limit — try again later' },
    );
    if (limited) return limited;
  }

  try {
    const result = await processArcadeRoll(db, userId, { useReroll, count });
    if (!result.ok) return result.response;
    return Response.json({
      run: result.run,
      meta: result.meta,
      roll: result.roll,
      rolls: result.rolls,
      busted: result.busted,
      donResult: result.donResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('roll failed', { userId, err: message });
    return Response.json(
      { error: message || 'Arcade roll failed' },
      { status: 500 },
    );
  }
});
