/**
 * Arcade shop offer generation — unique unlocked upgrades not already owned.
 */

import {
  SHOP_BASE_PRICE,
  SHOP_OFFER_COUNT,
  SHOP_SCALE_EVERY,
  SHOP_SCALE_STEP,
} from './economy.js';
import { ARCADE_UPGRADES, type ArcadeUpgradeId } from './upgrades.js';

export type ShopOffer = {
  upgradeId: ArcadeUpgradeId;
  price: number;
};

export function shopPriceFor(
  upgradeId: ArcadeUpgradeId,
  rollCount: number,
): number {
  const def = ARCADE_UPGRADES[upgradeId];
  const base = SHOP_BASE_PRICE[def.priceTier];
  const scale =
    1 + Math.floor(Math.max(0, rollCount) / SHOP_SCALE_EVERY) * SHOP_SCALE_STEP;
  return Math.max(1, Math.floor(base * scale));
}

/**
 * Build up to SHOP_OFFER_COUNT unique offers from unlocked − owned.
 * Uses Fisher–Yates with a provided RNG (0..1 exclusive).
 */
export function buildShopOffers(
  unlocked: readonly ArcadeUpgradeId[],
  owned: readonly ArcadeUpgradeId[],
  rollCount: number,
  random: () => number = Math.random,
): ShopOffer[] {
  const ownedSet = new Set(owned);
  const pool = unlocked.filter((id) => !ownedSet.has(id));
  // Shuffle copy
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, SHOP_OFFER_COUNT).map((upgradeId) => ({
    upgradeId,
    price: shopPriceFor(upgradeId, rollCount),
  }));
}
