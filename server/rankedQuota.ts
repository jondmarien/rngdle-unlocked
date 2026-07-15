/**
 * Ranked roll quota helpers (visibility only — does not change enforcement).
 */

import type { Db } from './db/index.js';
import {
  LIMITS,
  peekRateLimitUtcHour,
  type RateLimitQuota,
} from './rateLimit.js';

/** Kept for callers that still reference the nominal 1h window length. */
export const RANKED_ROLL_WINDOW_MS = 3_600_000;

export function rankedRollRateKey(userId: string): string {
  return `user:${userId}:ranked-roll`;
}

export function rankedQuotaRateKey(userId: string): string {
  return `user:${userId}:ranked-quota`;
}

/** Read-only Ranked gameplay quota (calendar UTC hour). */
export async function getRankedRollQuota(
  db: Db,
  userId: string,
): Promise<RateLimitQuota> {
  return peekRateLimitUtcHour(
    db,
    rankedRollRateKey(userId),
    LIMITS.rankedRollsPerHour,
  );
}
