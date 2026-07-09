import { badgeRarityFromEP } from '../rarity';
import { maskAll } from '../highlights';
import type { BadgeHit } from '../types';
import { NUMBER_BADGES } from './catalog';

export { NUMBER_BADGES, badgeById } from './catalog';

export function evaluateBadges(n: number): BadgeHit[] {
  const hits: BadgeHit[] = [];
  for (const b of NUMBER_BADGES) {
    if (b.matches(n)) {
      const highlights = b.highlight ? b.highlight(n) : maskAll(n);
      hits.push({
        id: b.id,
        name: b.name,
        description: b.description,
        ep: b.ep,
        family: b.family,
        emoji: b.emoji,
        highlights,
        rarity: badgeRarityFromEP(b.ep),
        ...(b.image ? { image: b.image } : {}),
      });
    }
  }
  hits.sort((a, b) => b.ep - a.ep || a.id.localeCompare(b.id));
  return hits;
}
