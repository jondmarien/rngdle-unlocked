import { and, desc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { follows, rolls, user } from './db/schema.js';
import { requestUrl } from './http.js';
import { createLogger } from './logger.js';

const log = createLogger('feed');

type FeedSource = 'all' | 'ranked' | 'practice';

/**
 * Activity feed of public rolls from people you follow **and yourself**
 * (moved verbatim from api/feed.ts).
 *
 * Query:
 *   ?source=all|ranked|practice  (default all)
 *   ?days=1..30                  (default 14)
 *   ?limit=1..100                (default 60)
 *
 * practice = Free play + challenges (source != ranked)
 * ranked   = server Ranked free play only
 */
export async function feedResponse(
  db: Db,
  request: Request,
  meId: string,
): Promise<Response> {
  const url = requestUrl(request);
  const sourceParam = (url.searchParams.get('source') ?? 'all').toLowerCase();
  const source: FeedSource =
    sourceParam === 'ranked' || sourceParam === 'practice'
      ? sourceParam
      : 'all';
  const days = Math.min(
    30,
    Math.max(1, Number(url.searchParams.get('days') ?? 14) || 14),
  );
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') ?? 60) || 60),
  );

  const following = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, meId));

  // Always include yourself so your own rolls show without self-follow
  const ids = [...new Set<string>([meId, ...following.map((f) => f.id)])];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const sourceClause =
    source === 'ranked'
      ? eq(rolls.source, 'ranked')
      : source === 'practice'
        ? // Free play + challenges (and any legacy non-ranked rows)
          sql`coalesce(${rolls.source}, 'client') <> 'ranked'`
        : undefined;

  const rows = await db
    .select({
      id: rolls.id,
      shortCode: rolls.shortCode,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      rolledAt: rolls.rolledAt,
      source: rolls.source,
      username: user.username,
      name: user.name,
      attestationSeal: rolls.attestationSeal,
      userId: rolls.userId,
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(
      and(
        inArray(rolls.userId, ids),
        eq(rolls.isPublic, true),
        gte(rolls.rolledAt, since),
        isNotNull(user.username),
        ...(sourceClause ? [sourceClause] : []),
      ),
    )
    .orderBy(desc(rolls.rolledAt))
    .limit(limit);

  const items = rows.map((r) => {
    const src =
      r.source === 'ranked'
        ? 'ranked'
        : r.source === 'challenge'
          ? 'challenge'
          : r.source === 'discord'
            ? 'discord'
            : 'client';
    return {
      id: r.id,
      shortCode: r.shortCode,
      number: r.number,
      totalEP: r.totalEp,
      rarity: r.rarity,
      source: src as 'ranked' | 'client' | 'challenge',
      rolledAt:
        r.rolledAt instanceof Date
          ? r.rolledAt.toISOString()
          : String(r.rolledAt),
      username: r.username,
      name: r.name,
      attested: Boolean(r.attestationSeal),
      isMe: r.userId === meId,
    };
  });

  log.info('ok', {
    userId: meId,
    source,
    following: following.length,
    count: items.length,
  });

  return Response.json({
    items,
    source,
    days,
    followingCount: following.length,
    includesSelf: true,
    message:
      following.length === 0 && items.length === 0
        ? 'No public rolls yet. Generate Free or Ranked rolls, or follow players from Find / Board.'
        : following.length === 0
          ? 'Showing your public rolls. Follow players from Find or Board to fill the feed.'
          : undefined,
  });
}
