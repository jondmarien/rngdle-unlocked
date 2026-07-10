import type { BadgeFamily, RarityTier } from '../game';

/** Custom Grok Imagine rarity medallions (public/icons/rarity). */
export const RARITY_ICON: Record<RarityTier, string> = {
  trash: '/icons/rarity/trash.jpg',
  common: '/icons/rarity/common.jpg',
  uncommon: '/icons/rarity/uncommon.jpg',
  rare: '/icons/rarity/rare.jpg',
  epic: '/icons/rarity/epic.jpg',
  anomaly: '/icons/rarity/anomaly.jpg',
  mythic: '/icons/rarity/mythic.jpg',
  divine: '/icons/rarity/divine.jpg',
};

/** Custom category icons for codex filters (public/icons/family). */
export const FAMILY_ICON: Partial<
  Record<BadgeFamily | 'secret' | 'all', string>
> = {
  math: '/icons/family/math.jpg',
  pattern: '/icons/family/pattern.jpg',
  void: '/icons/family/void.jpg',
  cultural: '/icons/family/cultural.jpg',
  magnitude: '/icons/family/magnitude.jpg',
  sequence: '/icons/family/sequence.jpg',
  poker: '/icons/family/poker.jpg',
  element: '/icons/family/element.jpg',
  bases: '/icons/family/bases.jpg',
  journey: '/icons/family/journey.jpg',
  secret: '/secrets/omega.jpg',
};
