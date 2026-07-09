import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { createDb } from '../server/db/index.js';
import { rolls, user, userProgress } from '../server/db/schema.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/leaderboard');

export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const started = Date.now();
  try {
    const db = createDb();
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:leaderboard`,
      LIMITS.leaderboardPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      log.warn('rate limited', { ip });
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const url = requestUrl(request);
    const period = url.searchParams.get('period') === 'week' ? 'week' : 'all';
    const sort = url.searchParams.get('sort') ?? 'ep';
    log.info('query', { period, sort, ip });
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50),
    );

    if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = await db
        .select({
          userId: rolls.userId,
          username: user.username,
          name: user.name,
          weekEP: sql<number>`coalesce(sum(${rolls.totalEp}), 0)`.mapWith(
            Number,
          ),
          weekRolls: sql<number>`count(*)`.mapWith(Number),
        })
        .from(rolls)
        .innerJoin(user, eq(user.id, rolls.userId))
        .where(
          and(
            gte(rolls.rolledAt, weekAgo),
            isNotNull(user.username),
            eq(rolls.isPublic, true),
          ),
        )
        .groupBy(rolls.userId, user.username, user.name)
        .orderBy(desc(sql`sum(${rolls.totalEp})`))
        .limit(limit);

      return Response.json({
        period,
        sort: 'ep',
        entries: rows.map((r, i) => ({
          rank: i + 1,
          username: r.username,
          name: r.name,
          lifetimeEP: r.weekEP,
          lifetimeRollCount: r.weekRolls,
          badgeCount: null as number | null,
        })),
      });
    }

    const rows = await db
      .select({
        userId: userProgress.userId,
        username: user.username,
        name: user.name,
        lifetimeEp: userProgress.lifetimeEp,
        lifetimeRollCount: userProgress.lifetimeRollCount,
        collectionJson: userProgress.collectionJson,
      })
      .from(userProgress)
      .innerJoin(user, eq(user.id, userProgress.userId))
      .where(isNotNull(user.username))
      .orderBy(
        sort === 'rolls'
          ? desc(userProgress.lifetimeRollCount)
          : desc(userProgress.lifetimeEp),
      )
      .limit(limit);

    const entries = rows
      .map((r) => {
        let badgeCount = 0;
        try {
          const c = JSON.parse(r.collectionJson || '[]');
          badgeCount = Array.isArray(c) ? c.length : 0;
        } catch {
          badgeCount = 0;
        }
        return {
          username: r.username,
          name: r.name,
          lifetimeEP: r.lifetimeEp,
          lifetimeRollCount: r.lifetimeRollCount,
          badgeCount,
        };
      })
      .sort((a, b) => {
        if (sort === 'badges') return b.badgeCount - a.badgeCount;
        if (sort === 'rolls') return b.lifetimeRollCount - a.lifetimeRollCount;
        return b.lifetimeEP - a.lifetimeEP;
      })
      .slice(0, limit)
      .map((e, i) => ({ rank: i + 1, ...e }));

    log.info('ok', {
      period: 'all',
      sort,
      count: entries.length,
      ms: Date.now() - started,
    });
    return Response.json({ period: 'all', sort, entries });
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
