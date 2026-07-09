import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { rateLimits } from './db/schema.js';

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

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

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Soft fairness: max rolls that may be uploaded per hour per user. */
export const LIMITS = {
  syncPerMinute: 30,
  rollsUploadPerHour: 120,
  leaderboardPerMinute: 60,
  profilePerMinute: 60,
} as const;
