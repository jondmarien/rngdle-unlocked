import { evaluateBadges } from './badges/index.js';
import { makeShortCode, newRollId } from './ids.js';
import { percentileFromEP } from './percentile.js';
import { rarityFromEP } from './rarity.js';
import { assertValidRollNumber, rollNumber } from './rng.js';
import { sumEP } from './score.js';
import type { RollResult } from './types.js';

export function evaluateNumber(
  n: number,
  at: Date = new Date(),
  extra?: { challengeKey?: string },
): RollResult {
  assertValidRollNumber(n);
  const badges = evaluateBadges(n);
  const totalEP = sumEP(badges);
  return {
    id: newRollId(),
    shortCode: makeShortCode(8),
    number: n,
    badges,
    totalEP,
    rarity: rarityFromEP(totalEP),
    percentile: percentileFromEP(totalEP),
    rolledAt: at.toISOString(),
    challengeKey: extra?.challengeKey,
  };
}

/** Backfill short codes on older local history entries. */
export function ensureShortCode(roll: RollResult): RollResult {
  if (roll.shortCode && roll.shortCode.length >= 6) return roll;
  return { ...roll, shortCode: makeShortCode(8) };
}

export async function performRoll(at: Date = new Date()): Promise<RollResult> {
  const number = await rollNumber();
  return evaluateNumber(number, at);
}
