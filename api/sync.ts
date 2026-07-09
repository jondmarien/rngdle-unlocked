import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import {
  loadCloudSave,
  saveCloudMerge,
  type CloudSavePayload,
} from '../server/sync.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/sync');

async function requireUserId(request: Request): Promise<string | null> {
  const auth = createAuth();
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return session?.user?.id ?? null;
}

export default defineHandler(async (request) => {
  log.info('request', { method: request.method });
  const userId = await requireUserId(request);
  if (!userId) {
    log.warn('unauthorized');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  log.debug('user', { userId });
  const db = createDb();

  if (request.method === 'GET') {
    const rl = await checkRateLimit(
      db,
      `user:${userId}:sync-get`,
      LIMITS.syncPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl);
    }
    const cloud = await loadCloudSave(db, userId);
    return Response.json({ cloud });
  }

  if (request.method === 'POST') {
    const rl = await checkRateLimit(
      db,
      `user:${userId}:sync-post`,
      LIMITS.syncPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(
        rl,
        `Slow down — try again in ${rl.retryAfterSec}s`,
      );
    }

    const hourRl = await checkRateLimit(
      db,
      `user:${userId}:rolls-hour`,
      LIMITS.rollsUploadPerHour,
      3_600_000,
    );
    if (isRateLimited(hourRl)) {
      return rateLimitedResponse(
        hourRl,
        'Roll upload limit reached for this hour. Play locally and sync later — no 24h lock, just soft fairness.',
      );
    }

    const body = (await request.json()) as CloudSavePayload;
    if (
      typeof body.lifetimeEP !== 'number' ||
      typeof body.lifetimeRollCount !== 'number' ||
      !Array.isArray(body.history)
    ) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const merged = await saveCloudMerge(db, userId, {
      lifetimeEP: body.lifetimeEP,
      lifetimeRollCount: body.lifetimeRollCount,
      journeyEP: body.journeyEP ?? 0,
      collection: body.collection ?? [],
      stats: body.stats,
      history: body.history ?? [],
    });
    log.info('merged', {
      userId,
      rolls: merged.lifetimeRollCount,
      ep: merged.lifetimeEP,
    });
    return Response.json({ cloud: merged });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
