import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  ne,
  sql,
} from 'drizzle-orm';
import { startOfUtcIsoWeek } from '../src/game/challenge.js';
import { RARITY_ORDER } from '../src/game/rarity.js';
import { createAuth } from './auth.js';
import type { Db } from './db/index.js';
import { rolls, user, userProgress } from './db/schema.js';
import { requestUrl } from './http.js';
import {
  friendsBoardExtras,
  loadFriendCircleIds,
} from './leaderboardFriends.js';
import { createLogger } from './logger.js';

const log = createLogger('leaderboard');

type Entry = {
  rank: number;
  username: string | null;
  name: string;
  lifetimeEP: number;
  lifetimeRollCount: number;
  badgeCount: number | null;
  userId?: string;
};

type BestRollEntry = {
  rank: number;
  username: string | null;
  name: string;
  number: number;
  totalEP: number;
  rarity: string;
  rolledAt: string;
  /** Present on All-Time Best Roll rows so the UI can show Free / Ranked / Challenge. */
  source?: 'client' | 'ranked' | 'challenge' | 'discord';
  userId?: string;
};

export type Scope = 'ranked' | 'practice' | 'alltime';
type BestSortBy = 'ep' | 'rarity';

/** Competitive fairness filters for Ranked surfaces. */
export function rankedRollFilters() {
  return and(
    isNotNull(user.username),
    eq(rolls.isPublic, true),
    eq(rolls.source, 'ranked'),
  );
}

/** Practice (honor-system) public non-ranked rolls. */
export function practiceRollFilters() {
  return and(
    isNotNull(user.username),
    eq(rolls.isPublic, true),
    ne(rolls.source, 'ranked'),
  );
}

/** All-Time Best Roll: any public roll (Free, Ranked, or Challenge). */
export function allPublicRollFilters() {
  return and(isNotNull(user.username), eq(rolls.isPublic, true));
}

/** Exported for unit tests — maps query `scope` to board pipeline. */
export function parseScope(raw: string | null): Scope {
  if (raw === 'practice' || raw === 'local') return 'practice';
  if (raw === 'alltime' || raw === 'lifetime') return 'alltime';
  return 'ranked';
}

/** SQL CASE rank from RARITY_ORDER (trash=0 … mythic=N). */
function rarityRankSql() {
  const cases = RARITY_ORDER.map((tier, i) =>
    sql.raw(`WHEN '${tier}' THEN ${i}`),
  );
  return sql`(CASE ${rolls.rarity} ${sql.join(cases, sql.raw(' '))} ELSE 0 END)`;
}

function parseFriendsOnly(raw: string | null): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Board query pipeline.
 *
 * Ranked   = server free-play rolls only (fair competition)
 * Practice = public Free play + challenge rolls (honor-system; not Ranked)
 * All-Time = synced overall lifetime progress from user_progress
 *
 * Optional `?view=best` switches to personal-best roll ranking (Total EP default).
 * Optional `?friendsOnly=1` restricts to the signed-in user's follow circle + self
 * (auth gated in api/leaderboard.ts via requireUser).
 */
export async function leaderboardResponse(
  db: Db,
  request: Request,
  started: number,
  opts?: { meId?: string },
): Promise<Response> {
  const url = requestUrl(request);
  const scope = parseScope(url.searchParams.get('scope'));
  const period =
    scope === 'alltime'
      ? 'all'
      : url.searchParams.get('period') === 'week'
        ? 'week'
        : 'all';
  const sort = url.searchParams.get('sort') ?? 'ep';
  const view = url.searchParams.get('view') === 'best' ? 'best' : 'total';
  const sortByParam = url.searchParams.get('sortBy');
  const sortBy: BestSortBy = sortByParam === 'rarity' ? 'rarity' : 'ep';
  const friendsOnly = parseFriendsOnly(url.searchParams.get('friendsOnly'));
  log.info('query', { view, scope, period, sort, sortBy, friendsOnly });
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50),
  );

  let meUserId: string | null = opts?.meId ?? null;
  let meUsername: string | null = null;
  try {
    const auth = createAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user) {
      const uid = session.user.id;
      meUserId = opts?.meId ?? uid;
      meUsername = session.user.username ?? null;
      if (!meUsername) {
        const [u] = await db
          .select({ username: user.username })
          .from(user)
          .where(eq(user.id, meUserId))
          .limit(1);
        meUsername = u?.username ?? null;
      }
    } else if (opts?.meId) {
      meUserId = opts.meId;
      const [u] = await db
        .select({ username: user.username })
        .from(user)
        .where(eq(user.id, opts.meId))
        .limit(1);
      meUsername = u?.username ?? null;
    }
  } catch {
    /* ignore session errors */
    if (opts?.meId) {
      meUserId = opts.meId;
      try {
        const [u] = await db
          .select({ username: user.username })
          .from(user)
          .where(eq(user.id, opts.meId))
          .limit(1);
        meUsername = u?.username ?? null;
      } catch {
        /* ignore */
      }
    }
  }

  let friendIds: string[] | null = null;
  let followingCount = 0;
  if (friendsOnly && meUserId) {
    const circle = await loadFriendCircleIds(db, meUserId);
    friendIds = circle.friendIds;
    followingCount = circle.followingCount;
  }

  const friendsExtras =
    friendIds != null ? friendsBoardExtras(followingCount) : null;

  if (view === 'best') {
    return bestRollBoard(db, {
      scope,
      period,
      sortBy,
      limit,
      meUserId,
      meUsername,
      started,
      friendIds,
      friendsExtras,
    });
  }

  if (scope === 'ranked') {
    return rankedBoard(db, {
      period,
      sort,
      limit,
      meUserId,
      meUsername,
      started,
      friendIds,
      friendsExtras,
    });
  }

  if (scope === 'alltime') {
    return allTimeBoard(db, {
      sort,
      limit,
      meUserId,
      meUsername,
      started,
      friendIds,
      friendsExtras,
    });
  }

  return practiceBoard(db, {
    period,
    sort,
    limit,
    meUserId,
    meUsername,
    started,
    friendIds,
    friendsExtras,
  });
}

type FriendsExtras = ReturnType<typeof friendsBoardExtras> | null;

/** Exported for unit tests — scope → roll filter contract. */
export function scopeRollFilters(scope: Scope) {
  if (scope === 'ranked') return rankedRollFilters();
  if (scope === 'alltime') return allPublicRollFilters();
  return practiceRollFilters();
}

async function bestRollBoard(
  db: Db,
  opts: {
    scope: Scope;
    period: 'all' | 'week';
    sortBy: BestSortBy;
    limit: number;
    meUserId: string | null;
    meUsername: string | null;
    started: number;
    friendIds: string[] | null;
    friendsExtras: FriendsExtras;
  },
) {
  const weekStart = startOfUtcIsoWeek(new Date());
  const periodFilter =
    opts.period === 'week' ? gte(rolls.rolledAt, weekStart) : undefined;
  const scopeFilter = scopeRollFilters(opts.scope);
  const friendsFilter =
    opts.friendIds != null ? inArray(rolls.userId, opts.friendIds) : undefined;

  const rankExpr = rarityRankSql();

  // Personal best per user: DISTINCT ON (user_id) with sort-mode ordering.
  // Fetch a wide pool then rank in app for stable me/find + limit.
  const personalBestOrder =
    opts.sortBy === 'rarity'
      ? [desc(rankExpr), desc(rolls.totalEp), asc(rolls.rolledAt)]
      : [desc(rolls.totalEp), asc(rolls.rolledAt)];

  const candidates = await db
    .select({
      userId: rolls.userId,
      username: user.username,
      name: user.name,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      rolledAt: rolls.rolledAt,
      source: rolls.source,
      rarityRank: sql<number>`${rankExpr}`.mapWith(Number),
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(
      and(
        scopeFilter,
        ...(periodFilter ? [periodFilter] : []),
        ...(friendsFilter ? [friendsFilter] : []),
      ),
    )
    .orderBy(...personalBestOrder)
    .limit(5000);

  const bestByUser = new Map<string, (typeof candidates)[number]>();
  for (const row of candidates) {
    if (!bestByUser.has(row.userId)) {
      bestByUser.set(row.userId, row);
    }
  }

  const all: BestRollEntry[] = [...bestByUser.values()]
    .sort((a, b) => {
      if (opts.sortBy === 'rarity') {
        if (b.rarityRank !== a.rarityRank) return b.rarityRank - a.rarityRank;
      }
      if (b.totalEp !== a.totalEp) return b.totalEp - a.totalEp;
      const at = a.rolledAt instanceof Date ? a.rolledAt.getTime() : 0;
      const bt = b.rolledAt instanceof Date ? b.rolledAt.getTime() : 0;
      return at - bt;
    })
    .map((r, i) => {
      const entry: BestRollEntry = {
        rank: i + 1,
        username: r.username,
        name: r.name,
        number: r.number,
        totalEP: r.totalEp,
        rarity: r.rarity,
        rolledAt:
          r.rolledAt instanceof Date
            ? r.rolledAt.toISOString()
            : String(r.rolledAt),
        userId: r.userId,
      };
      // Lane chip only on All-Time Best (Free + Ranked + Challenge).
      if (opts.scope === 'alltime') {
        entry.source = normalizeRollSource(r.source);
      }
      return entry;
    });

  const me = findBestMe(all, opts.meUserId, opts.meUsername);
  const entries = all.slice(0, opts.limit).map(publicBestEntry);

  log.info('ok', {
    view: 'best',
    scope: opts.scope,
    period: opts.period,
    sortBy: opts.sortBy,
    count: entries.length,
    meRank: me?.rank ?? null,
    ms: Date.now() - opts.started,
  });

  return Response.json({
    view: 'best',
    period: opts.period,
    sortBy: opts.sortBy,
    scope: opts.scope,
    entries,
    me,
    ...opts.friendsExtras,
  });
}

async function rankedBoard(
  db: Db,
  opts: {
    period: 'all' | 'week';
    sort: string;
    limit: number;
    meUserId: string | null;
    meUsername: string | null;
    started: number;
    friendIds: string[] | null;
    friendsExtras: FriendsExtras;
  },
) {
  const weekStart = startOfUtcIsoWeek(new Date());
  const periodFilter =
    opts.period === 'week' ? gte(rolls.rolledAt, weekStart) : undefined;
  const friendsFilter =
    opts.friendIds != null ? inArray(rolls.userId, opts.friendIds) : undefined;

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
        rankedRollFilters(),
        ...(periodFilter ? [periodFilter] : []),
        ...(friendsFilter ? [friendsFilter] : []),
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
    ...opts.friendsExtras,
  });
}

async function practiceBoard(
  db: Db,
  opts: {
    period: 'all' | 'week';
    sort: string;
    limit: number;
    meUserId: string | null;
    meUsername: string | null;
    started: number;
    friendIds: string[] | null;
    friendsExtras: FriendsExtras;
  },
) {
  // Public Free play + challenge rolls (not Ranked) — week and all-time share filters.
  const weekStart = startOfUtcIsoWeek(new Date());
  const periodFilter =
    opts.period === 'week' ? gte(rolls.rolledAt, weekStart) : undefined;
  const friendsFilter =
    opts.friendIds != null ? inArray(rolls.userId, opts.friendIds) : undefined;

  const rows = await db
    .select({
      userId: rolls.userId,
      username: user.username,
      name: user.name,
      periodEP: sql<number>`coalesce(sum(${rolls.totalEp}), 0)`.mapWith(Number),
      periodRolls: sql<number>`count(*)`.mapWith(Number),
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(
      and(
        practiceRollFilters(),
        ...(periodFilter ? [periodFilter] : []),
        ...(friendsFilter ? [friendsFilter] : []),
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
      lifetimeEP: r.periodEP,
      lifetimeRollCount: r.periodRolls,
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
    scope: 'practice',
    period: opts.period,
    sort: opts.sort,
    count: entries.length,
    meRank: me?.rank ?? null,
    ms: Date.now() - opts.started,
  });

  return Response.json({
    period: opts.period,
    sort: opts.sort === 'rolls' ? 'rolls' : 'ep',
    scope: 'practice',
    entries,
    me,
    ...opts.friendsExtras,
  });
}

/** Combined synced lifetime progress (Free + Ranked + Challenge + journey EP). */
async function allTimeBoard(
  db: Db,
  opts: {
    sort: string;
    limit: number;
    meUserId: string | null;
    meUsername: string | null;
    started: number;
    friendIds: string[] | null;
    friendsExtras: FriendsExtras;
  },
) {
  const friendsFilter =
    opts.friendIds != null
      ? inArray(userProgress.userId, opts.friendIds)
      : undefined;
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
    .where(
      and(isNotNull(user.username), ...(friendsFilter ? [friendsFilter] : [])),
    )
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
    scope: 'alltime',
    period: 'all',
    sort: opts.sort,
    count: entries.length,
    meRank: me?.rank ?? null,
    ms: Date.now() - opts.started,
  });

  return Response.json({
    period: 'all',
    sort: opts.sort,
    scope: 'alltime',
    entries,
    me,
    ...opts.friendsExtras,
  });
}

function publicEntry(e: Entry): Omit<Entry, 'userId'> {
  const { userId: _u, ...rest } = e;
  return rest;
}

function publicBestEntry(e: BestRollEntry): Omit<BestRollEntry, 'userId'> {
  const { userId: _u, ...rest } = e;
  return rest;
}

function normalizeRollSource(
  raw: string | null | undefined,
): 'client' | 'ranked' | 'challenge' | 'discord' {
  if (raw === 'ranked' || raw === 'challenge' || raw === 'discord') return raw;
  return 'client';
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

function findBestMe(
  all: BestRollEntry[],
  meUserId: string | null,
  meUsername: string | null,
): Omit<BestRollEntry, 'userId'> | null {
  if (!meUserId && !meUsername) return null;
  const hit = all.find(
    (e) =>
      (meUserId && e.userId === meUserId) ||
      (meUsername &&
        e.username &&
        e.username.toLowerCase() === meUsername.toLowerCase()),
  );
  if (!hit) return null;
  return publicBestEntry(hit);
}
