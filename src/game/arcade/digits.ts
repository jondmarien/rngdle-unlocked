/**
 * Pure Digits award math for Arcade Mode.
 * EP is an input only — never written back to lifetime EP.
 */

import { rarityRank } from '../rarity.js';
import type { RarityTier } from '../types.js';
import {
  BADGE_MAGNET_PER_BADGE,
  COMBO_CHAIN_CAP,
  COMBO_CHAIN_STEP,
  CURRENCY_SURGE_MULT,
  DIGITS_BASE_BY_RARITY,
  EP_DIVISOR,
  EPIC_SURGE_MULT,
  FLOOR_RAISE_AS,
  MIN_DIGITS_BEFORE_MULT,
  RARE_AMP_MULT,
} from './economy.js';
import type { ArcadeUpgradeId } from './upgrades.js';

export type DigitsAwardInput = {
  rarity: RarityTier;
  totalEP: number;
  badgeCount: number;
  owned: readonly ArcadeUpgradeId[];
  /** Consecutive non-trash rolls before this one (0 = just reset / first). */
  comboStreakBefore: number;
  surgeActive: boolean;
};

export type DigitsAwardResult = {
  baseDigits: number;
  finalDigits: number;
  /** Combo streak after applying this roll's rarity. */
  comboStreakAfter: number;
};

function has(owned: readonly ArcadeUpgradeId[], id: ArcadeUpgradeId): boolean {
  return owned.includes(id);
}

/** Digits from rarity base + EP tail, before multipliers. */
export function rawDigitsFromRoll(
  rarity: RarityTier,
  totalEP: number,
  owned: readonly ArcadeUpgradeId[],
): number {
  let payoutRarity = rarity;
  if (rarity === 'trash' && has(owned, 'floor_raise')) {
    payoutRarity = FLOOR_RAISE_AS;
  }
  const base = DIGITS_BASE_BY_RARITY[payoutRarity] ?? 1;
  const withEp = Math.floor(base + Math.max(0, totalEP) / EP_DIVISOR);
  return Math.max(MIN_DIGITS_BEFORE_MULT, withEp);
}

export function awardDigits(input: DigitsAwardInput): DigitsAwardResult {
  const { rarity, totalEP, badgeCount, owned, comboStreakBefore, surgeActive } =
    input;

  let baseDigits = rawDigitsFromRoll(rarity, totalEP, owned);
  let mult = 1;

  if (has(owned, 'rare_amp') && rarityRank(rarity) >= rarityRank('rare')) {
    mult *= RARE_AMP_MULT;
  }
  if (has(owned, 'epic_surge') && rarityRank(rarity) >= rarityRank('epic')) {
    mult *= EPIC_SURGE_MULT;
  }
  if (has(owned, 'combo_chain') && rarity !== 'trash') {
    const bonus = Math.min(
      COMBO_CHAIN_CAP,
      comboStreakBefore * COMBO_CHAIN_STEP,
    );
    mult *= 1 + bonus;
  }
  if (surgeActive) {
    mult *= CURRENCY_SURGE_MULT;
  }

  let finalDigits = Math.floor(baseDigits * mult);
  if (has(owned, 'badge_magnet')) {
    finalDigits += Math.max(0, badgeCount) * BADGE_MAGNET_PER_BADGE;
  }

  const comboStreakAfter = rarity === 'trash' ? 0 : comboStreakBefore + 1;

  return {
    baseDigits,
    finalDigits: Math.max(0, finalDigits),
    comboStreakAfter,
  };
}
