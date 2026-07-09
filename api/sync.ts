import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { checkRateLimit, LIMITS } from '../server/rateLimit.js';
import {
  loadCloudSave,
  saveCloudMerge,
  type CloudSavePayload,
} from '../server/sync.js';

async function requireUserId(request: Request): Promise<string | null> {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = createDb();

    if (request.method === 'GET') {
      const rl = await checkRateLimit(
        db,
        `user:${userId}:sync-get`,
        LIMITS.syncPerMinute,
        60_000,
      );
      if (!rl.ok) {
        return Response.json(
          { error: 'Rate limited', retryAfterSec: rl.retryAfterSec },
          { status: 429 },
        );
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
      if (!rl.ok) {
        return Response.json(
          {
            error: `Slow down — try again in ${rl.retryAfterSec}s`,
            retryAfterSec: rl.retryAfterSec,
          },
          { status: 429 },
        );
      }

      // Hourly roll upload budget (fairness, not a daily lock)
      const hourRl = await checkRateLimit(
        db,
        `user:${userId}:rolls-hour`,
        LIMITS.rollsUploadPerHour,
        3_600_000,
      );
      if (!hourRl.ok) {
        return Response.json(
          {
            error:
              'Roll upload limit reached for this hour. Play locally and sync later — no 24h lock, just soft fairness.',
            retryAfterSec: hourRl.retryAfterSec,
          },
          { status: 429 },
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
      return Response.json({ cloud: merged });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    console.error('[api/sync]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
