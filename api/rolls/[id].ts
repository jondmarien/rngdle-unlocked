import { rateGuard } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { clientIp, LIMITS } from '../../server/rateLimit.js';
import { findPublicRoll } from '../../server/rollLookup.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/rolls');

export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    const ip = clientIp(request);
    const limited = await rateGuard(
      db,
      `ip:${ip}:roll`,
      LIMITS.profilePerMinute,
      60_000,
      { withRetryAfterHeader: false },
    );
    if (limited) return limited;

    const url = requestUrl(request);
    const parts = url.pathname.split('/').filter(Boolean);
    const key = decodeURIComponent(parts[parts.length - 1] ?? '');
    const userHint =
      url.searchParams.get('user') ?? url.searchParams.get('u') ?? undefined;
    if (!key) {
      return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    log.info('lookup', { key, userHint });

    const row = await findPublicRoll(db, key, userHint);
    if (!row) {
      return Response.json({ error: 'Roll not found' }, { status: 404 });
    }

    let badges: unknown[] = [];
    try {
      badges = JSON.parse(row.badgesJson || '[]');
    } catch {
      badges = [];
    }

    return Response.json({
      roll: {
        id: row.id,
        shortCode: row.shortCode,
        number: row.number,
        totalEP: row.totalEp,
        rarity: row.rarity,
        percentile: row.percentile,
        badges,
        rolledAt: row.rolledAt,
        player: {
          username: row.username,
          name: row.name,
        },
      },
    });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
});
