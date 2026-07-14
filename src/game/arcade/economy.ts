/**
 * Arcade Mode economy knobs — single source of truth for Digits math,
 * shop prices, cooldowns, and meta unlocks. Soft v1 estimates; retune here
 * without hunting call sites.
 */

import type { RarityTier } from '../types.js';
import type { ArcadeUpgradeId } from './upgrades.js';

/** Digits base payout by roll rarity (before EP tail + multipliers). */
export const DIGITS_BASE_BY_RARITY: Record<RarityTier, number> = {
  trash: 1,
  common: 2,
  uncommon: 5,
  rare: 12,
  epic: 25,
  anomaly: 40,
  mythic: 80,
  divine: 160,
};

/** `floor(base + totalEP / EP_DIVISOR)` — soft v1 curve. */
export const EP_DIVISOR = 500;

/** Minimum Digits from a roll before multipliers. */
export const MIN_DIGITS_BEFORE_MULT = 1;

/** Passive: treat trash Digits payout as this rarity's base. */
export const FLOOR_RAISE_AS: RarityTier = 'common';

/** Passive rare_amp: multiplier on rare+ Digits. */
export const RARE_AMP_MULT = 1.5;

/** Passive epic_surge: multiplier on epic+ Digits. */
export const EPIC_SURGE_MULT = 2;

/** Passive combo_chain: +15% per consecutive non-trash, cap +75%. */
export const COMBO_CHAIN_STEP = 0.15;
export const COMBO_CHAIN_CAP = 0.75;

/** Passive badge_magnet: flat Digits per badge hit. */
export const BADGE_MAGNET_PER_BADGE = 2;

/** Active currency_surge: Digits mult for N rolls. */
export const CURRENCY_SURGE_MULT = 2;
export const CURRENCY_SURGE_ROLLS = 3;

/** Active rarity_lock: re-roll if below this rarity, up to N attempts. */
export const RARITY_LOCK_MIN: RarityTier = 'uncommon';
export const RARITY_LOCK_ATTEMPTS = 3;

/** Double or Nothing: success if rarity rank >= this tier. */
export const DON_SUCCESS_MIN: RarityTier = 'rare';

/** Shop: how many offers after each roll. */
export const SHOP_OFFER_COUNT = 3;

/**
 * Shop base prices by upgrade "tier" (cheap / mid / spicy).
 * Scale: price * (1 + floor(rollCount / SHOP_SCALE_EVERY) * SHOP_SCALE_STEP)
 */
export const SHOP_BASE_PRICE: Record<'cheap' | 'mid' | 'spicy', number> = {
  cheap: 8,
  mid: 15,
  spicy: 25,
};
export const SHOP_SCALE_EVERY = 5;
export const SHOP_SCALE_STEP = 0.25;

/** Roll-count cooldowns after using an active (rolls until ready again). */
export const ACTIVE_COOLDOWNS: Record<
  Extract<
    ArcadeUpgradeId,
    | 'double_or_nothing'
    | 'reroll'
    | 'rarity_lock'
    | 'currency_surge'
    | 'bonus_spin'
  >,
  number
> = {
  double_or_nothing: 5,
  reroll: 3,
  rarity_lock: 4,
  currency_surge: 6,
  bonus_spin: 4,
};

/** Starter unlocks available on first Arcade visit. */
export const STARTER_UNLOCKS: readonly ArcadeUpgradeId[] = [
  'floor_raise',
  'rare_amp',
  'reroll',
  'double_or_nothing',
] as const;

export type MetaUnlockRule =
  | { upgradeId: ArcadeUpgradeId; kind: 'runs'; minRuns: number }
  | { upgradeId: ArcadeUpgradeId; kind: 'bestScore'; minScore: number };

/** Permanent unlock milestones (checked after each completed run). */
export const META_UNLOCK_RULES: readonly MetaUnlockRule[] = [
  { upgradeId: 'deadline', kind: 'runs', minRuns: 2 },
  { upgradeId: 'combo_chain', kind: 'runs', minRuns: 3 },
  { upgradeId: 'badge_magnet', kind: 'runs', minRuns: 5 },
  { upgradeId: 'bonus_spin', kind: 'runs', minRuns: 10 },
  { upgradeId: 'rarity_lock', kind: 'bestScore', minScore: 100 },
  { upgradeId: 'currency_surge', kind: 'bestScore', minScore: 250 },
  { upgradeId: 'epic_surge', kind: 'bestScore', minScore: 500 },
] as const;

/** Idle Digits (meta): modest passive accrual. */
export const IDLE_DIGITS_PER_HOUR = 2;
export const IDLE_MAX_OFFLINE_HOURS = 12;
export const IDLE_BANK_CAP = 100;

/** Trash streak soft-fail (not a hard bust). */
export const TRASH_STREAK_THRESHOLD = 3;
export const TRASH_SOFT_FAIL_PENALTY_FRAC = 0.15;
export const TRASH_SOFT_FAIL_PENALTY_MIN = 2;
export const TRASH_SOFT_FAIL_ROLLS = 3;

/** Deadline (opt-in): target = max(FLOOR, ceil(digits * MULT)); N rolls or bust. */
export const DEADLINE_MULT = 1.75;
export const DEADLINE_FLOOR_TARGET = 20;
export const DEADLINE_ROLLS = 6;
export const DEADLINE_SUCCESS_BONUS_FRAC = 0.25;

/** Rate-limit suggestions mirrored in server/rateLimit.ts LIMITS. */
export const ARCADE_RATE_HINTS = {
  rollsPerHour: 120,
  mutatePerMinute: 40,
  leaderboardPerMinute: 60,
} as const;
