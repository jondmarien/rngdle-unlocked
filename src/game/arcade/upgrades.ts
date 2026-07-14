/**
 * Arcade upgrade catalog — quality over quantity (10 for v1).
 * Own once; no stacking duplicates.
 */

export const ARCADE_UPGRADE_IDS = [
  'floor_raise',
  'rare_amp',
  'epic_surge',
  'combo_chain',
  'badge_magnet',
  'double_or_nothing',
  'reroll',
  'rarity_lock',
  'currency_surge',
  'bonus_spin',
  'deadline',
] as const;

export type ArcadeUpgradeId = (typeof ARCADE_UPGRADE_IDS)[number];

export type ArcadeUpgradeType = 'passive' | 'active';

export type ArcadeUpgradeDef = {
  id: ArcadeUpgradeId;
  type: ArcadeUpgradeType;
  name: string;
  description: string;
  /** Shop price band. */
  priceTier: 'cheap' | 'mid' | 'spicy';
};

export const ARCADE_UPGRADES: Record<ArcadeUpgradeId, ArcadeUpgradeDef> = {
  floor_raise: {
    id: 'floor_raise',
    type: 'passive',
    name: 'Floor Raise',
    description: 'Trash rolls pay Digits as if they were Common.',
    priceTier: 'cheap',
  },
  rare_amp: {
    id: 'rare_amp',
    type: 'passive',
    name: 'Rare Amp',
    description: '+50% Digits on Rare and above.',
    priceTier: 'mid',
  },
  epic_surge: {
    id: 'epic_surge',
    type: 'passive',
    name: 'Epic Surge',
    description: '+100% Digits on Epic and above (multiplies with Rare Amp).',
    priceTier: 'spicy',
  },
  combo_chain: {
    id: 'combo_chain',
    type: 'passive',
    name: 'Combo Chain',
    description:
      'Each consecutive non-trash roll: +15% Digits (caps at +75%). Resets on trash.',
    priceTier: 'mid',
  },
  badge_magnet: {
    id: 'badge_magnet',
    type: 'passive',
    name: 'Badge Magnet',
    description: '+2 Digits per badge hit on the roll.',
    priceTier: 'cheap',
  },
  double_or_nothing: {
    id: 'double_or_nothing',
    type: 'active',
    name: 'Double or Nothing',
    description:
      'Wager all Digits on the next roll: Rare+ doubles them; otherwise you bust.',
    priceTier: 'spicy',
  },
  reroll: {
    id: 'reroll',
    type: 'active',
    name: 'Reroll',
    description:
      'Discard this roll’s Digits award and immediately roll again (one extra spin).',
    priceTier: 'mid',
  },
  rarity_lock: {
    id: 'rarity_lock',
    type: 'active',
    name: 'Rarity Lock',
    description:
      'Next roll: if below Uncommon, re-roll up to 3 times and keep the best rarity.',
    priceTier: 'spicy',
  },
  currency_surge: {
    id: 'currency_surge',
    type: 'active',
    name: 'Currency Surge',
    description: 'Next 3 rolls award +100% Digits.',
    priceTier: 'spicy',
  },
  bonus_spin: {
    id: 'bonus_spin',
    type: 'active',
    name: 'Bonus Spin',
    description:
      'Take an extra roll now without opening the shop (still advances cooldowns).',
    priceTier: 'mid',
  },
  deadline: {
    id: 'deadline',
    type: 'passive',
    name: 'Deadline',
    description:
      'Opt-in pressure: hit 1.75× your Digits (min 20) within 6 rolls for a +25% target bonus — miss and you bust.',
    priceTier: 'spicy',
  },
};

export function isArcadeUpgradeId(id: string): id is ArcadeUpgradeId {
  return (ARCADE_UPGRADE_IDS as readonly string[]).includes(id);
}
