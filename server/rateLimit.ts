import { eq } from 'drizzle-orm';
import { RANKED_ROLLS_PER_HOUR } from '../src/lib/ranked-limits.js';
import type { Db } from './db/index.js';
import { rateLimits } from './db/schema.js';

/** Visibility DTO for a fixed-window counter (does not imply a check was charged). */
export type RateLimitQuota = {
  limit: number;
  remaining: number;
  used: number;
  /** Seconds until window end; null when no active window (full unused quota). */
  resetsInSec: number | null;
  /** ISO timestamp when the window ends; null when no active window. */
  resetAt: string | null;
};

export type RateLimitOk = {
  ok: true;
  remaining: number;
  quota: RateLimitQuota;
};
export type RateLimitBlocked = {
  ok: false;
  retryAfterSec: number;
  quota: RateLimitQuota;
};
export type RateLimitResult = RateLimitOk | RateLimitBlocked;

export function isRateLimited(rl: RateLimitResult): rl is RateLimitBlocked {
  return rl.ok === false;
}

function activeQuota(
  limit: number,
  used: number,
  windowStartMs: number,
  windowMs: number,
  now: number,
): RateLimitQuota {
  const remaining = Math.max(0, limit - used);
  const resetsInSec = Math.max(
    1,
    Math.ceil((windowMs - (now - windowStartMs)) / 1000),
  );
  return {
    limit,
    remaining,
    used,
    resetsInSec,
    resetAt: new Date(windowStartMs + windowMs).toISOString(),
  };
}

function fullQuota(limit: number): RateLimitQuota {
  return {
    limit,
    remaining: limit,
    used: 0,
    resetsInSec: null,
    resetAt: null,
  };
}

/** 429 JSON body for rate-limited requests. */
export function rateLimitedResponse(
  rl: RateLimitBlocked,
  error = 'Rate limited',
  withRetryAfterHeader = false,
  extra?: Record<string, unknown>,
): Response {
  const headers = withRetryAfterHeader
    ? { 'Retry-After': String(rl.retryAfterSec) }
    : undefined;
  return Response.json(
    { error, retryAfterSec: rl.retryAfterSec, quota: rl.quota, ...extra },
    { status: 429, headers },
  );
}

/**
 * Read-only view of a fixed-window counter. Never inserts or increments.
 * Expired / missing rows report full unused quota (resetsInSec/resetAt null).
 */
export async function peekRateLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitQuota> {
  const now = Date.now();
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!row) return fullQuota(limit);

  const start = row.windowStart.getTime();
  if (now - start >= windowMs) return fullQuota(limit);

  return activeQuota(limit, row.count, start, windowMs, now);
}

/** Floor `now` to the start of its UTC calendar hour. */
export function startOfUtcHourMs(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    0,
    0,
    0,
  );
}

const UTC_HOUR_MS = 3_600_000;

export type UtcHourRateLimitOpts = {
  /**
   * Map raw counter → effective used (e.g. Ranked Plus regen refill).
   * Gate and reported `used`/`remaining` use the mapped value; the stored
   * counter still increments by 1 on success.
   */
  mapUsed?: (rawUsed: number) => number;
};

/**
 * Read-only view of a calendar-UTC-hour counter.
 * Window starts at :00:00.000Z and ends at the next UTC hour.
 */
export async function peekRateLimitUtcHour(
  db: Db,
  key: string,
  limit: number,
  opts?: UtcHourRateLimitOpts,
): Promise<RateLimitQuota> {
  const now = Date.now();
  const hourStart = startOfUtcHourMs(now);
  const mapUsed = opts?.mapUsed ?? ((n: number) => n);
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!row || row.windowStart.getTime() < hourStart) {
    return fullQuota(limit);
  }

  const used = Math.max(0, mapUsed(row.count));
  return activeQuota(limit, used, hourStart, UTC_HOUR_MS, now);
}

/**
 * Calendar-UTC-hour fixed window (resets at each :00:00.000Z).
 * Used for Ranked rolls/hour — not for soft burst limits.
 */
export async function checkRateLimitUtcHour(
  db: Db,
  key: string,
  limit: number,
  opts?: UtcHourRateLimitOpts,
): Promise<RateLimitResult> {
  const now = Date.now();
  const hourStart = startOfUtcHourMs(now);
  const mapUsed = opts?.mapUsed ?? ((n: number) => n);
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!row || row.windowStart.getTime() < hourStart) {
    if (!row) {
      await db.insert(rateLimits).values({
        key,
        windowStart: new Date(hourStart),
        count: 1,
      });
    } else {
      await db
        .update(rateLimits)
        .set({ windowStart: new Date(hourStart), count: 1 })
        .where(eq(rateLimits.key, key));
    }
    const used = Math.max(0, mapUsed(1));
    const quota = activeQuota(limit, used, hourStart, UTC_HOUR_MS, now);
    return { ok: true, remaining: quota.remaining, quota };
  }

  const effectiveUsed = Math.max(0, mapUsed(row.count));
  if (effectiveUsed >= limit) {
    const quota = activeQuota(
      limit,
      effectiveUsed,
      hourStart,
      UTC_HOUR_MS,
      now,
    );
    return {
      ok: false,
      retryAfterSec: quota.resetsInSec ?? 1,
      quota,
    };
  }

  const nextCount = row.count + 1;
  await db
    .update(rateLimits)
    .set({ count: nextCount })
    .where(eq(rateLimits.key, key));
  const used = Math.max(0, mapUsed(nextCount));
  const quota = activeQuota(limit, used, hourStart, UTC_HOUR_MS, now);
  return { ok: true, remaining: quota.remaining, quota };
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
    const quota = activeQuota(limit, 1, now, windowMs, now);
    return { ok: true, remaining: quota.remaining, quota };
  }

  const start = row.windowStart.getTime();
  if (now - start >= windowMs) {
    await db
      .update(rateLimits)
      .set({ windowStart: new Date(now), count: 1 })
      .where(eq(rateLimits.key, key));
    const quota = activeQuota(limit, 1, now, windowMs, now);
    return { ok: true, remaining: quota.remaining, quota };
  }

  if (row.count >= limit) {
    const quota = activeQuota(limit, row.count, start, windowMs, now);
    return {
      ok: false,
      retryAfterSec: quota.resetsInSec ?? 1,
      quota,
    };
  }

  const nextCount = row.count + 1;
  await db
    .update(rateLimits)
    .set({ count: nextCount })
    .where(eq(rateLimits.key, key));
  const quota = activeQuota(limit, nextCount, start, windowMs, now);
  return { ok: true, remaining: quota.remaining, quota };
}

export function clientIp(request: {
  headers: { get(name: string): string | null };
}): string {
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
  rankedRollsPerHour: RANKED_ROLLS_PER_HOUR,
  /** Soft burst on GET /api/ranked-roll/quota (not the gameplay cap). */
  rankedQuotaPerMinute: 60,
  leaderboardPerMinute: 60,
  profilePerMinute: 60,
  followPerMinute: 30,
  /** Profile vanity PATCH (/api/me). */
  mePatchPerMinute: 30,
  feedPerMinute: 60,
  attestPerMinute: 20,
  challengePerMinute: 60,
  ogPerMinute: 120,
  notificationsPerMinute: 60,
  usersSearchPerMinute: 40,
  systemMessagePostPerMinute: 10,
  adminMutatePerMinute: 30,
  reportPerMinute: 10,
  /** Feature request submissions per user per hour. */
  featureRequestSubmitPerHour: 5,
  /** Feature request author/admin edits (title/description/tag) per hour. */
  featureRequestEditPerHour: 20,
  /** Feature request upvotes per user per minute. */
  featureRequestVotePerMinute: 30,
  /** Soft burst on feature request list GET. */
  featureRequestListPerMinute: 60,
  /** Arcade Mode — higher frequency than Ranked (run rolls). */
  arcadeRollsPerHour: 120,
  /** Arcade start / buy / cash-out / abandon / arm active. */
  arcadeMutatePerMinute: 40,
  /** Arcade leaderboard GET. */
  arcadeLeaderboardPerMinute: 60,
  /** Polar checkout session / portal create. */
  checkoutPerMinute: 10,
} as const;
