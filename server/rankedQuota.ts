/**
 * Ranked roll quota helpers (visibility + regen-aware remaining).
 */

import { eq } from 'drizzle-orm';
import type { RankedTier } from '../src/lib/ranked-limits.js';
import { computeRankedRegen } from '../src/lib/ranked-regen.js';
import type { Db } from './db/index.js';
import { rateLimits } from './db/schema.js';
import {
  getEffectiveRankedLimit,
  getEffectiveRankedTier,
  getTopupHourState,
} from './polar/entitlements.js';
import { startOfUtcHourMs, type RateLimitQuota } from './rateLimit.js';

/** Kept for callers that still reference the nominal 1h window length. */
export const RANKED_ROLL_WINDOW_MS = 3_600_000;

export function rankedRollRateKey(userId: string): string {
  return `user:${userId}:ranked-roll`;
}

export function rankedQuotaRateKey(userId: string): string {
  return `user:${userId}:ranked-quota`;
}

export type RankedQuotaDetails = RateLimitQuota & {
  topupBonus: number;
  packBonus: number;
  hasOverload: boolean;
  regenPerTick: number;
  regenIntervalSec: number;
  nextRegenInSec: number | null;
  rankedTier: RankedTier;
};

/** mapUsed for Ranked rate-limit check (regen refill toward cap). */
export async function rankedRegenMapUsed(
  db: Db,
  userId: string,
  now = Date.now(),
): Promise<(rawUsed: number) => number> {
  const tier = await getEffectiveRankedTier(db, userId);
  const hourStart = startOfUtcHourMs(now);
  const msSinceHourStart = Math.max(0, now - hourStart);
  return (rawUsed: number) =>
    computeRankedRegen({
      tier,
      rawUsed,
      msSinceHourStart,
    }).effectiveUsed;
}

async function rawRankedUsed(
  db: Db,
  userId: string,
  now: number,
): Promise<number> {
  const hourStart = startOfUtcHourMs(now);
  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, rankedRollRateKey(userId)))
    .limit(1);
  if (!row || row.windowStart.getTime() < hourStart) return 0;
  return row.count;
}

/** Read-only Ranked gameplay quota (calendar UTC hour; per-user effective cap + regen). */
export async function getRankedRollQuota(
  db: Db,
  userId: string,
): Promise<RankedQuotaDetails> {
  const now = Date.now();
  const hourStart = startOfUtcHourMs(now);
  const msSinceHourStart = Math.max(0, now - hourStart);
  const tier = await getEffectiveRankedTier(db, userId);
  const limit = await getEffectiveRankedLimit(db, userId);
  const topup = await getTopupHourState(db, userId);
  const rawUsed = await rawRankedUsed(db, userId, now);
  const regen = computeRankedRegen({
    tier,
    rawUsed,
    msSinceHourStart,
  });
  const used = regen.effectiveUsed;
  const remaining = Math.max(0, limit - used);
  const atFull = remaining >= limit;
  const resetsInSec =
    rawUsed === 0
      ? null
      : Math.max(1, Math.ceil((3_600_000 - msSinceHourStart) / 1000));

  const quota: RankedQuotaDetails = {
    limit,
    remaining,
    used,
    resetsInSec,
    resetAt:
      resetsInSec == null
        ? null
        : new Date(hourStart + 3_600_000).toISOString(),
    topupBonus: topup.totalBonus,
    packBonus: topup.packBonus,
    hasOverload: topup.hasOverload,
    regenPerTick: regen.regenPerTick,
    regenIntervalSec: regen.regenIntervalSec,
    nextRegenInSec: atFull ? null : regen.nextRegenInSec,
    rankedTier: tier,
  };
  return quota;
}
