import { buildPeriodSeed } from '../src/game/challenge.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { createDb } from '../server/db/index.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/challenge');

/** Public daily + weekly challenge seeds (feature 5). */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:challenge`,
      LIMITS.challengePerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const now = new Date();
    const daily = buildPeriodSeed('daily', now);
    const weekly = buildPeriodSeed('weekly', now);
    log.info('ok', { daily: daily.periodKey, weekly: weekly.periodKey });

    return Response.json({
      daily,
      weekly,
      serverTime: now.toISOString(),
    });
  } catch (err) {
    log.error('fail', {
      err: err instanceof Error ? err.message : String(err),
    });
    // Still return seeds without DB if rate limit table missing
    const now = new Date();
    return Response.json({
      daily: buildPeriodSeed('daily', now),
      weekly: buildPeriodSeed('weekly', now),
      serverTime: now.toISOString(),
    });
  }
});
