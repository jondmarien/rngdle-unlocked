import { and, desc, eq } from 'drizzle-orm';
import { createDb } from '../../server/db/index.js';
import { rolls, user, userProgress } from '../../server/db/schema.js';
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
      `ip:${ip}:profile`,
      LIMITS.profilePerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/profile/:username
    const username = decodeURIComponent(parts[parts.length - 1] ?? '')
      .trim()
      .toLowerCase();
    if (!username || username.length < 3) {
      return Response.json({ error: 'Invalid username' }, { status: 400 });
    }

    const [u] = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (!u) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, u.id))
      .limit(1);

    const recent = await db
      .select({
        id: rolls.id,
        number: rolls.number,
        totalEp: rolls.totalEp,
        rarity: rolls.rarity,
        percentile: rolls.percentile,
        badgesJson: rolls.badgesJson,
        rolledAt: rolls.rolledAt,
      })
      .from(rolls)
      .where(and(eq(rolls.userId, u.id), eq(rolls.isPublic, true)))
      .orderBy(desc(rolls.rolledAt))
      .limit(12);

    const collection = progress
      ? (JSON.parse(progress.collectionJson || '[]') as unknown[])
      : [];
    const stats = progress
      ? JSON.parse(progress.statsJson || '{}')
      : {};

    return Response.json({
      profile: {
        username: u.username,
        name: u.name,
        image: u.image,
        memberSince: u.createdAt,
        lifetimeEP: progress?.lifetimeEp ?? 0,
        lifetimeRollCount: progress?.lifetimeRollCount ?? 0,
        journeyEP: progress?.journeyEp ?? 0,
        badgeCount: Array.isArray(collection) ? collection.length : 0,
        stats,
        recentRolls: recent.map((r) => ({
          id: r.id,
          number: r.number,
          totalEP: r.totalEp,
          rarity: r.rarity,
          percentile: r.percentile,
          badgeCount: (() => {
            try {
              return JSON.parse(r.badgesJson || '[]').length;
            } catch {
              return 0;
            }
          })(),
          rolledAt: r.rolledAt,
        })),
      },
    });
  } catch (err) {
    console.error('[api/profile]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
