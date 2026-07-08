import type { BadgeHit } from './types';

export function sumEP(badges: Pick<BadgeHit, 'ep'>[]): number {
  return badges.reduce((acc, b) => acc + b.ep, 0);
}
