import { and, eq } from 'drizzle-orm';
import { createDb } from '../../server/db/index.js';
import { rolls, user } from '../../server/db/schema.js';
import type { ApiRequest } from '../../server/http.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../../server/rateLimit.js';

export default async function handler(request: ApiRequest): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:roll`,
      LIMITS.profilePerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl);
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = decodeURIComponent(parts[parts.length - 1] ?? '');
    if (!id) {
      return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    const [row] = await db
      .select({
        id: rolls.id,
        number: rolls.number,
        totalEp: rolls.totalEp,
        rarity: rolls.rarity,
        percentile: rolls.percentile,
        badgesJson: rolls.badgesJson,
        rolledAt: rolls.rolledAt,
        isPublic: rolls.isPublic,
        username: user.username,
        name: user.name,
      })
      .from(rolls)
      .innerJoin(user, eq(user.id, rolls.userId))
      .where(and(eq(rolls.id, id), eq(rolls.isPublic, true)))
      .limit(1);

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
    console.error('[api/rolls]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
