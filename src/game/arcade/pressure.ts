/**
 * Trash streak soft-fail — pressure without hard bust.
 */

import {
  TRASH_SOFT_FAIL_PENALTY_FRAC,
  TRASH_SOFT_FAIL_PENALTY_MIN,
  TRASH_SOFT_FAIL_ROLLS,
  TRASH_STREAK_THRESHOLD,
} from './economy.js';
import type { RarityTier } from '../types.js';

export type TrashStreakTickInput = {
  rarity: RarityTier;
  trashStreakBefore: number;
  softFailRollsRemainingBefore: number;
  digitsBeforePenalty: number;
};

export type TrashStreakTickResult = {
  trashStreakAfter: number;
  softFailRollsRemainingAfter: number;
  /** Digits lost on soft-fail trigger (0 if none). */
  penaltyDigits: number;
  /** Whether Digits award should be halved this roll. */
  halfGain: boolean;
  triggeredSoftFail: boolean;
};

export function trashSoftFailPenalty(digits: number): number {
  const d = Math.max(0, Math.floor(digits));
  if (d <= 0) return 0;
  return Math.min(
    d,
    Math.max(
      TRASH_SOFT_FAIL_PENALTY_MIN,
      Math.floor(d * TRASH_SOFT_FAIL_PENALTY_FRAC),
    ),
  );
}

/** Apply soft-fail half to an award (min 1 if award was positive). */
export function applySoftFailHalf(finalDigits: number): number {
  if (finalDigits <= 0) return 0;
  return Math.max(1, Math.floor(finalDigits / 2));
}

/**
 * Update trash streak / soft-fail state for one roll.
 * Soft-fail active rolls still tick the soft-fail counter down.
 */
export function tickTrashStreak(
  input: TrashStreakTickInput,
): TrashStreakTickResult {
  let softFail = Math.max(0, input.softFailRollsRemainingBefore);
  const halfGain = softFail > 0;
  if (softFail > 0) {
    softFail -= 1;
  }

  if (input.rarity !== 'trash') {
    return {
      trashStreakAfter: 0,
      softFailRollsRemainingAfter: softFail,
      penaltyDigits: 0,
      halfGain,
      triggeredSoftFail: false,
    };
  }

  const streak = input.trashStreakBefore + 1;
  if (streak >= TRASH_STREAK_THRESHOLD) {
    const penalty = trashSoftFailPenalty(input.digitsBeforePenalty);
    return {
      trashStreakAfter: 0,
      softFailRollsRemainingAfter: TRASH_SOFT_FAIL_ROLLS,
      penaltyDigits: penalty,
      halfGain,
      triggeredSoftFail: true,
    };
  }

  return {
    trashStreakAfter: streak,
    softFailRollsRemainingAfter: softFail,
    penaltyDigits: 0,
    halfGain,
    triggeredSoftFail: false,
  };
}

export function trashStreakThreshold(): number {
  return TRASH_STREAK_THRESHOLD;
}
