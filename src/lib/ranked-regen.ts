/**
 * Ranked Plus passive refill toward hour cap (lazy effective-used math).
 */

import { accrueDiscreteTicks } from '../game/timedAccrual.js';
import {
  RANKED_REGEN_INTERVAL_MS,
  rankedRegenPerTick,
  type RankedTier,
} from './ranked-limits.js';

export type RankedRegenInput = {
  tier: RankedTier;
  /** Raw rate_limits.count for this UTC hour. */
  rawUsed: number;
  /** Ms since start of current UTC hour. */
  msSinceHourStart: number;
};

export type RankedRegenResult = {
  regenPerTick: number;
  regenIntervalSec: number;
  regenApplied: number;
  effectiveUsed: number;
  /** Seconds until next tick; null when full remaining or free tier. */
  nextRegenInSec: number | null;
};

/**
 * Compute refill credit for Ranked Plus.
 * regenApplied cannot exceed rawUsed (never restores above the hour cap via regen).
 */
export function computeRankedRegen(input: RankedRegenInput): RankedRegenResult {
  const regenPerTick = rankedRegenPerTick(input.tier);
  const rawUsed = Math.max(0, Math.floor(input.rawUsed));
  const intervalSec = Math.floor(RANKED_REGEN_INTERVAL_MS / 1000);

  const { accrued, msToNextTick } = accrueDiscreteTicks({
    elapsedMs: input.msSinceHourStart,
    intervalMs: RANKED_REGEN_INTERVAL_MS,
    amountPerTick: regenPerTick,
    maxAccrue: rawUsed,
  });

  const effectiveUsed = Math.max(0, rawUsed - accrued);
  const atFull = effectiveUsed === 0 || accrued >= rawUsed;
  const nextRegenInSec =
    regenPerTick === 0 || atFull || msToNextTick == null
      ? null
      : Math.max(1, Math.ceil(msToNextTick / 1000));

  return {
    regenPerTick,
    regenIntervalSec: intervalSec,
    regenApplied: accrued,
    effectiveUsed,
    nextRegenInSec,
  };
}
