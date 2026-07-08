import type { BadgeHit } from '../types';
import { NUMBER_BADGES } from './catalog';

export { NUMBER_BADGES, badgeById } from './catalog';

export function evaluateBadges(n: number): BadgeHit[] {
  const hits: BadgeHit[] = [];
  for (const b of NUMBER_BADGES) {
    if (b.matches(n)) {
      hits.push({
        id: b.id,
        name: b.name,
        description: b.description,
        ep: b.ep,
        family: b.family,
      });
    }
  }
  // Stable sort: highest EP first, then id
  hits.sort((a, b) => b.ep - a.ep || a.id.localeCompare(b.id));
  return hits;
}
