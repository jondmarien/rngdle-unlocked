/**
 * Ranked roll quota helpers (visibility only — does not change enforcement).
 */

import type { Db } from './db/index.js';
import { LIMITS, peekRateLimit, type RateLimitQuota } from './rateLimit.js';

export const RANKED_ROLL_WINDOW_MS = 3_600_000;

export function rankedRollRateKey(userId: string): string {
  return `user:${userId}:ranked-roll`;
}

export function rankedQuotaRateKey(userId: string): string {
  return `user:${userId}:ranked-quota`;
}

/** Read-only Ranked gameplay quota for the current user. */
export async function getRankedRollQuota(
  db: Db,
  userId: string,
): Promise<RateLimitQuota> {
  return peekRateLimit(
    db,
    rankedRollRateKey(userId),
    LIMITS.rankedRollsPerHour,
    RANKED_ROLL_WINDOW_MS,
  );
}
