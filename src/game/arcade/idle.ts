/**
 * Idle Digits accrual — pure server-side math (never trust client elapsed).
 */

import {
  IDLE_BANK_CAP,
  IDLE_DIGITS_PER_HOUR,
  IDLE_MAX_OFFLINE_HOURS,
} from './economy.js';

export type IdleAccrualInput = {
  lastClaimAt: Date;
  now: Date;
  currentBank: number;
  ratePerHour?: number;
  maxOfflineHours?: number;
  bankCap?: number;
};

export type IdleAccrualResult = {
  elapsedMs: number;
  cappedMs: number;
  digitsEarned: number;
  nextBank: number;
};

/** Digits accrued since last claim, capped by offline window and bank size. */
export function computeIdleAccrual(input: IdleAccrualInput): IdleAccrualResult {
  const rate = input.ratePerHour ?? IDLE_DIGITS_PER_HOUR;
  const maxHours = input.maxOfflineHours ?? IDLE_MAX_OFFLINE_HOURS;
  const bankCap = input.bankCap ?? IDLE_BANK_CAP;
  const bank = Math.max(0, Math.floor(input.currentBank));

  const elapsedMs = Math.max(
    0,
    input.now.getTime() - input.lastClaimAt.getTime(),
  );
  const cappedMs = Math.min(elapsedMs, maxHours * 3_600_000);
  const raw = Math.floor((cappedMs / 3_600_000) * rate);
  const room = Math.max(0, bankCap - bank);
  const digitsEarned = Math.min(raw, room);

  return {
    elapsedMs,
    cappedMs,
    digitsEarned,
    nextBank: Math.min(bankCap, bank + digitsEarned),
  };
}

/** Pending Digits for display (no bank mutate). */
export function previewIdlePending(input: IdleAccrualInput): number {
  return computeIdleAccrual(input).digitsEarned;
}
