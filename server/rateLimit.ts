import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { rateLimits } from './db/schema.js';

export type RateLimitOk = { ok: true; remaining: number };
export type RateLimitBlocked = { ok: false; retryAfterSec: number };
export type RateLimitResult = RateLimitOk | RateLimitBlocked;

export function isRateLimited(rl: RateLimitResult): rl is RateLimitBlocked {
  return rl.ok === false;
}

/** 429 JSON body for rate-limited requests. */
export function rateLimitedResponse(
  rl: RateLimitBlocked,
  error = 'Rate limited',
  withRetryAfterHeader = false,
): Response {
  const headers = withRetryAfterHeader
    ? { 'Retry-After': String(rl.retryAfterSec) }
    : undefined;
  return Response.json(
    { error, retryAfterSec: rl.retryAfterSec },
    { status: 429, headers },
  );
}

/**
 * Sliding fixed-window counter in Postgres (serverless-safe).
 * key e.g. `user:abc:sync` or `ip:1.2.3.4:leaderboard`
 */
export async function checkRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!row) {
    await db.insert(rateLimits).values({
      key,
      windowStart: new Date(now),
      count: 1,
    });
    return { ok: true, remaining: limit - 1 };
  }

  const start = row.windowStart.getTime();
  if (now - start >= windowMs) {
    await db
      .update(rateLimits)
      .set({ windowStart: new Date(now), count: 1 })
      .where(eq(rateLimits.key, key));
    return { ok: true, remaining: limit - 1 };
  }

  if (row.count >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - start)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  await db
    .update(rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(rateLimits.key, key));
  return { ok: true, remaining: limit - row.count - 1 };
}

export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Soft API burst guards — not gameplay roll locks (free play is unlimited). */
export const LIMITS = {
  /** Burst guard on /api/sync only — not a per-roll-hour cap. */
  syncPerMinute: 60,
  /** Server-issued ranked free-play rolls per user per hour. */
  rankedRollsPerHour: 90,
  leaderboardPerMinute: 60,
  profilePerMinute: 60,
  followPerMinute: 30,
  feedPerMinute: 60,
  attestPerMinute: 20,
  challengePerMinute: 60,
  ogPerMinute: 120,
  notificationsPerMinute: 60,
  usersSearchPerMinute: 40,
  systemMessagePostPerMinute: 10,
} as const;
