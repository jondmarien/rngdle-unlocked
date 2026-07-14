/**
 * Deadline shop upgrade — pure helpers (bust-or-bonus pressure).
 * Digits never convert to EP.
 */

import {
  DEADLINE_FLOOR_TARGET,
  DEADLINE_MULT,
  DEADLINE_ROLLS,
  DEADLINE_SUCCESS_BONUS_FRAC,
} from './economy.js';

/** Target Digits when Deadline is purchased. */
export function deadlineTargetFromDigits(currentDigits: number): number {
  const d = Math.max(0, Math.floor(currentDigits));
  return Math.max(DEADLINE_FLOOR_TARGET, Math.ceil(d * DEADLINE_MULT));
}

export function deadlineSuccessBonus(target: number): number {
  return Math.ceil(Math.max(0, target) * DEADLINE_SUCCESS_BONUS_FRAC);
}

export function deadlineInitialRolls(): number {
  return DEADLINE_ROLLS;
}

export type DeadlineTickInput = {
  digitsAfterAward: number;
  target: number;
  rollsRemainingBefore: number;
};

export type DeadlineTickResult =
  | { kind: 'inactive' }
  | { kind: 'success'; bonusDigits: number }
  | { kind: 'progress'; rollsRemaining: number }
  | { kind: 'bust' };

/**
 * After Digits award for a roll: resolve Deadline pressure.
 * Inactive when target/rolls are 0.
 */
export function tickDeadline(input: DeadlineTickInput): DeadlineTickResult {
  const { digitsAfterAward, target, rollsRemainingBefore } = input;
  if (target <= 0 || rollsRemainingBefore <= 0) {
    return { kind: 'inactive' };
  }
  if (digitsAfterAward >= target) {
    return {
      kind: 'success',
      bonusDigits: deadlineSuccessBonus(target),
    };
  }
  const next = rollsRemainingBefore - 1;
  if (next <= 0) {
    return { kind: 'bust' };
  }
  return { kind: 'progress', rollsRemaining: next };
}
