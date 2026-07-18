/**
 * Idle Digits accrual — pure server-side math (never trust client elapsed).
 */

import { accrueRate } from '../timedAccrual.js';
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
  const room = Math.max(0, bankCap - bank);

  const elapsedMs = Math.max(
    0,
    input.now.getTime() - input.lastClaimAt.getTime(),
  );
  const { cappedMs, accrued } = accrueRate({
    elapsedMs,
    ratePerHour: rate,
    room,
    maxOfflineMs: maxHours * 3_600_000,
  });

  return {
    elapsedMs,
    cappedMs,
    digitsEarned: accrued,
    nextBank: Math.min(bankCap, bank + accrued),
  };
}

/** Pending Digits for display (no bank mutate). */
export function previewIdlePending(input: IdleAccrualInput): number {
  return computeIdleAccrual(input).digitsEarned;
}
