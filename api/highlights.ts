import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { createDb } from '../server/db/index.js';
import { rolls, user } from '../server/db/schema.js';
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

const log = createLogger('api/highlights');

type BadgeSnippet = {
  name: string;
  emoji: string;
  family?: string;
  rarity?: string;
  ep?: number;
};

type HighlightRoll = {
  id: string;
  shortCode: string | null;
  number: number;
  totalEP: number;
  rarity: string;
  username: string | null;
  badgeCount: number;
  topBadges: BadgeSnippet[];
  rolledAt: string;
};

/**
 * Community roll highlights for the home screen.
 * ?tzOffset= minutes from Date.getTimezoneOffset() so “today” matches the client calendar.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:highlights`,
      LIMITS.leaderboardPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const url = requestUrl(request);
    // Date.getTimezoneOffset(): minutes *behind* UTC (EST = 300)
    const tzOffset = Number(url.searchParams.get('tzOffset') ?? 0);
    const offsetMs = Number.isFinite(tzOffset) ? tzOffset * 60_000 : 0;

    const now = Date.now();
    // Local "now" as wall clock via offset
    const localNow = new Date(now - offsetMs);
    const localMidnightUtcMs =
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
      ) + offsetMs;
    const dayStart = new Date(localMidnightUtcMs);
    const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [todayBest, weekBest, todayCount, weekCount] = await Promise.all([
      bestPublicRollSince(db, dayStart),
      bestPublicRollSince(db, weekStart),
      countPublicRollsSince(db, dayStart),
      countPublicRollsSince(db, weekStart),
    ]);

    log.info('ok', {
      today: todayBest?.number ?? null,
      week: weekBest?.number ?? null,
      todayCount,
      weekCount,
    });

    return Response.json({
      today: todayBest,
      week: weekBest,
      todayRollCount: todayCount,
      weekRollCount: weekCount,
      dayStart: dayStart.toISOString(),
      weekStart: weekStart.toISOString(),
    });
  } catch (err) {
    log.error('fail', {
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
});

async function bestPublicRollSince(
  db: ReturnType<typeof createDb>,
  since: Date,
): Promise<HighlightRoll | null> {
  const [row] = await db
    .select({
      id: rolls.id,
      shortCode: rolls.shortCode,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      badgesJson: rolls.badgesJson,
      rolledAt: rolls.rolledAt,
      username: user.username,
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(
      and(
        gte(rolls.rolledAt, since),
        eq(rolls.isPublic, true),
        isNotNull(user.username),
      ),
    )
    .orderBy(desc(rolls.totalEp), desc(rolls.rolledAt))
    .limit(1);

  if (!row) return null;
  return mapHighlight(row);
}

async function countPublicRollsSince(
  db: ReturnType<typeof createDb>,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(rolls)
    .where(and(gte(rolls.rolledAt, since), eq(rolls.isPublic, true)));
  return row?.n ?? 0;
}

function mapHighlight(row: {
  id: string;
  shortCode: string | null;
  number: number;
  totalEp: number;
  rarity: string;
  badgesJson: string;
  rolledAt: Date | string;
  username: string | null;
}): HighlightRoll {
  let topBadges: BadgeSnippet[] = [];
  let badgeCount = 0;
  try {
    const badges = JSON.parse(row.badgesJson || '[]') as {
      name?: string;
      emoji?: string;
      family?: string;
      rarity?: string;
      ep?: number;
    }[];
    badgeCount = badges.length;
    topBadges = [...badges]
      .sort((a, b) => (b.ep ?? 0) - (a.ep ?? 0))
      .slice(0, 12)
      .map((b) => ({
        name: b.name ?? 'Badge',
        emoji: b.emoji ?? '✦',
        family: b.family,
        rarity: b.rarity,
        ep: b.ep,
      }));
  } catch {
    badgeCount = 0;
  }

  return {
    id: row.id,
    shortCode: row.shortCode,
    number: row.number,
    totalEP: row.totalEp,
    rarity: row.rarity,
    username: row.username,
    badgeCount,
    topBadges,
    rolledAt:
      row.rolledAt instanceof Date
        ? row.rolledAt.toISOString()
        : String(row.rolledAt),
  };
}
