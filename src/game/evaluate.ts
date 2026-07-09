import { evaluateBadges } from './badges';
import { percentileFromEP } from './percentile';
import { rarityFromEP } from './rarity';
import { assertValidRollNumber, rollNumber } from './rng';
import { sumEP } from './score';
import type { RollResult } from './types';

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Fallback without Math.random: time + CSPRNG bytes if available
  try {
    const b = new Uint8Array(4);
    c!.getRandomValues(b);
    const n = new DataView(b.buffer).getUint32(0, false);
    return `roll-${Date.now()}-${n.toString(16)}`;
  } catch {
    return `roll-${Date.now()}`;
  }
}

export function evaluateNumber(n: number, at: Date = new Date()): RollResult {
  assertValidRollNumber(n);
  const badges = evaluateBadges(n);
  const totalEP = sumEP(badges);
  return {
    id: newId(),
    number: n,
    badges,
    totalEP,
    rarity: rarityFromEP(totalEP),
    percentile: percentileFromEP(totalEP),
    rolledAt: at.toISOString(),
  };
}

export async function performRoll(at: Date = new Date()): Promise<RollResult> {
  const number = await rollNumber();
  return evaluateNumber(number, at);
}
