import { and, desc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
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

type Entry = {
  rank: number;
  username: string | null;
  name: string;
  lifetimeEP: number;
  lifetimeRollCount: number;
  badgeCount: number | null;
  userId?: string;
};

type Scope = 'ranked' | 'practice';

/**
 * GET /api/leaderboard
 * ?scope=ranked|practice  (default ranked)
 * ?period=all|week
 * ?sort=ep|rolls|badges  (badges mainly for practice all-time)
 *
 * Ranked  = server free-play rolls only (fair competition)
 * Practice = synced progress / public free-play activity (social / honor-system)
 */
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
    const scopeParam = url.searchParams.get('scope');
    const scope: Scope =
      scopeParam === 'practice' || scopeParam === 'local'
        ? 'practice'
        : 'ranked';
    const period = url.searchParams.get('period') === 'week' ? 'week' : 'all';
    const sort = url.searchParams.get('sort') ?? 'ep';
    log.info('query', { scope, period, sort, ip });
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50),
    );

    let meUserId: string | null = null;
    let meUsername: string | null = null;
    try {
      const auth = createAuth();
      const session = await auth.api.getSession({ headers: request.headers });
      if (session?.user) {
        const uid = session.user.id;
        meUserId = uid;
        meUsername =
          (session.user as { username?: string | null }).username ?? null;
        if (!meUsername) {
          const [u] = await db
            .select({ username: user.username })
            .from(user)
            .where(eq(user.id, uid))
            .limit(1);
          meUsername = u?.username ?? null;
        }
      }
    } catch {
      /* ignore session errors */
    }

    if (scope === 'ranked') {
      return rankedBoard(db, {
        period,
        sort,
        limit,
        meUserId,
        meUsername,
        started,
      });
    }

    return practiceBoard(db, {
      period,
      sort,
      limit,
      meUserId,
      meUsername,
      started,
    });
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

async function rankedBoard(
  db: ReturnType<typeof createDb>,
  opts: {
    period: 'all' | 'week';
    sort: string;
    limit: number;
    meUserId: string | null;
    meUsername: string | null;
    started: number;
  },
) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const periodFilter =
    opts.period === 'week' ? gte(rolls.rolledAt, weekAgo) : undefined;

  const rows = await db
    .select({
      userId: rolls.userId,
      username: user.username,
      name: user.name,
      lifetimeEp: sql<number>`coalesce(sum(${rolls.totalEp}), 0)`.mapWith(
        Number,
      ),
      lifetimeRollCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(
      and(
        isNotNull(user.username),
        eq(rolls.isPublic, true),
        eq(rolls.source, 'ranked'),
        ...(periodFilter ? [periodFilter] : []),
      ),
    )
    .groupBy(rolls.userId, user.username, user.name)
    .orderBy(
      opts.sort === 'rolls'
        ? desc(sql`count(*)`)
        : desc(sql`sum(${rolls.totalEp})`),
    )
    .limit(Math.max(opts.limit, 500));

  const all: Entry[] = rows
    .map((r) => ({
      username: r.username,
      name: r.name,
      lifetimeEP: r.lifetimeEp,
      lifetimeRollCount: r.lifetimeRollCount,
      badgeCount: null as number | null,
      userId: r.userId,
    }))
    .sort((a, b) => {
      if (opts.sort === 'rolls')
        return b.lifetimeRollCount - a.lifetimeRollCount;
      return b.lifetimeEP - a.lifetimeEP;
    })
    .map((e, i) => ({ rank: i + 1, ...e }));

  const me = findMe(all, opts.meUserId, opts.meUsername);
  const entries = all.slice(0, opts.limit).map(publicEntry);

  log.info('ok', {
    scope: 'ranked',
    period: opts.period,
    sort: opts.sort,
    count: entries.length,
    meRank: me?.rank ?? null,
    ms: Date.now() - opts.started,
  });

  return Response.json({
    period: opts.period,
    sort: opts.sort === 'rolls' ? 'rolls' : 'ep',
    scope: 'ranked',
    entries,
    me,
  });
}

async function practiceBoard(
  db: ReturnType<typeof createDb>,
  opts: {
    period: 'all' | 'week';
    sort: string;
    limit: number;
    meUserId: string | null;
    meUsername: string | null;
    started: number;
  },
) {
  // Week: public free-play / challenge activity (not ranked competitive)
  if (opts.period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        userId: rolls.userId,
        username: user.username,
        name: user.name,
        weekEP: sql<number>`coalesce(sum(${rolls.totalEp}), 0)`.mapWith(Number),
        weekRolls: sql<number>`count(*)`.mapWith(Number),
      })
      .from(rolls)
      .innerJoin(user, eq(user.id, rolls.userId))
      .where(
        and(
          gte(rolls.rolledAt, weekAgo),
          isNotNull(user.username),
          eq(rolls.isPublic, true),
          // Practice week = client free play + challenges (honor-system social)
          ne(rolls.source, 'ranked'),
        ),
      )
      .groupBy(rolls.userId, user.username, user.name)
      .orderBy(desc(sql`sum(${rolls.totalEp})`))
      .limit(Math.max(opts.limit, 500));

    const all: Entry[] = rows.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      name: r.name,
      lifetimeEP: r.weekEP,
      lifetimeRollCount: r.weekRolls,
      badgeCount: null as number | null,
      userId: r.userId,
    }));

    const me = findMe(all, opts.meUserId, opts.meUsername);
    const entries = all.slice(0, opts.limit).map(publicEntry);

    log.info('ok', {
      scope: 'practice',
      period: 'week',
      count: entries.length,
      meRank: me?.rank ?? null,
      ms: Date.now() - opts.started,
    });

    return Response.json({
      period: 'week',
      sort: 'ep',
      scope: 'practice',
      entries,
      me,
    });
  }

  // All-time practice: synced lifetime progress (local free play + challenges + any cloud totals)
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
      opts.sort === 'rolls'
        ? desc(userProgress.lifetimeRollCount)
        : desc(userProgress.lifetimeEp),
    )
    .limit(Math.max(opts.limit, 500));

  const all: Entry[] = rows
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
        userId: r.userId,
      };
    })
    .sort((a, b) => {
      if (opts.sort === 'badges') return b.badgeCount - a.badgeCount;
      if (opts.sort === 'rolls')
        return b.lifetimeRollCount - a.lifetimeRollCount;
      return b.lifetimeEP - a.lifetimeEP;
    })
    .map((e, i) => ({ rank: i + 1, ...e }));

  const me = findMe(all, opts.meUserId, opts.meUsername);
  const entries = all.slice(0, opts.limit).map(publicEntry);

  log.info('ok', {
    scope: 'practice',
    period: 'all',
    sort: opts.sort,
    count: entries.length,
    meRank: me?.rank ?? null,
    ms: Date.now() - opts.started,
  });

  return Response.json({
    period: 'all',
    sort: opts.sort,
    scope: 'practice',
    entries,
    me,
  });
}

function publicEntry(e: Entry): Omit<Entry, 'userId'> {
  const { userId: _u, ...rest } = e;
  return rest;
}

function findMe(
  all: Entry[],
  meUserId: string | null,
  meUsername: string | null,
): Omit<Entry, 'userId'> | null {
  if (!meUserId && !meUsername) return null;
  const hit = all.find(
    (e) =>
      (meUserId && e.userId === meUserId) ||
      (meUsername &&
        e.username &&
        e.username.toLowerCase() === meUsername.toLowerCase()),
  );
  if (!hit) return null;
  return publicEntry(hit);
}
