/**
 * Pure timed accrual helpers (Arcade idle Digits + Ranked Plus regen).
 * Never trust client-supplied elapsed — callers compute elapsed server-side.
 */

export type AccrueRateInput = {
  elapsedMs: number;
  ratePerHour: number;
  /** Max units that can still fit (e.g. bank room). */
  room: number;
  /** Cap how far back elapsed may count (ms). */
  maxOfflineMs?: number;
};

export type AccrueRateResult = {
  elapsedMs: number;
  cappedMs: number;
  accrued: number;
};

/** Continuous rate: floor((cappedMs / 1h) * ratePerHour), capped by room. */
export function accrueRate(input: AccrueRateInput): AccrueRateResult {
  const elapsedMs = Math.max(0, Math.floor(input.elapsedMs));
  const rate = Math.max(0, input.ratePerHour);
  const room = Math.max(0, Math.floor(input.room));
  const cappedMs =
    input.maxOfflineMs != null
      ? Math.min(elapsedMs, Math.max(0, input.maxOfflineMs))
      : elapsedMs;
  const raw = Math.floor((cappedMs / 3_600_000) * rate);
  const accrued = Math.min(raw, room);
  return { elapsedMs, cappedMs, accrued };
}

export type AccrueDiscreteTicksInput = {
  elapsedMs: number;
  intervalMs: number;
  amountPerTick: number;
  /** Cannot accrue more than this (e.g. Ranked rawUsed for refill). */
  maxAccrue: number;
};

export type AccrueDiscreteTicksResult = {
  elapsedMs: number;
  ticks: number;
  accrued: number;
  /** Ms until next tick completes; null when amountPerTick is 0. */
  msToNextTick: number | null;
};

/** Discrete ticks: floor(elapsed / interval) * amount, capped by maxAccrue. */
export function accrueDiscreteTicks(
  input: AccrueDiscreteTicksInput,
): AccrueDiscreteTicksResult {
  const elapsedMs = Math.max(0, Math.floor(input.elapsedMs));
  const intervalMs = Math.max(1, Math.floor(input.intervalMs));
  const amountPerTick = Math.max(0, Math.floor(input.amountPerTick));
  const maxAccrue = Math.max(0, Math.floor(input.maxAccrue));

  if (amountPerTick === 0) {
    return { elapsedMs, ticks: 0, accrued: 0, msToNextTick: null };
  }

  const ticks = Math.floor(elapsedMs / intervalMs);
  const raw = ticks * amountPerTick;
  const accrued = Math.min(raw, maxAccrue);
  const msIntoInterval = elapsedMs % intervalMs;
  const msToNextTick = intervalMs - msIntoInterval;

  return { elapsedMs, ticks, accrued, msToNextTick };
}
