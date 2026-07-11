import { JOURNEY_BADGES } from './journey.js';
import { OMEGA_SECRET, SECTION_SECRETS } from './secrets.js';
import { STREAK_SECRETS } from './streakSecrets.js';

export type UnlockedSeal = {
  id: string;
  name: string;
  image?: string;
  kind: 'journey' | 'streak' | 'section' | 'omega';
};

/** Lifetime / secret / mastery seals present in a collection id set. */
export function listUnlockedSeals(
  collectionIds: Iterable<string>,
): UnlockedSeal[] {
  const have =
    collectionIds instanceof Set ? collectionIds : new Set(collectionIds);
  const out: UnlockedSeal[] = [];
  for (const b of JOURNEY_BADGES) {
    if (have.has(b.id)) {
      out.push({
        id: b.id,
        name: b.name,
        image: b.image,
        kind: 'journey',
      });
    }
  }
  for (const s of STREAK_SECRETS) {
    if (have.has(s.id)) {
      out.push({
        id: s.id,
        name: s.name,
        image: s.image,
        kind: 'streak',
      });
    }
  }
  for (const s of SECTION_SECRETS) {
    if (have.has(s.id)) {
      out.push({
        id: s.id,
        name: s.name,
        image: s.image,
        kind: 'section',
      });
    }
  }
  if (have.has(OMEGA_SECRET.id)) {
    out.push({
      id: OMEGA_SECRET.id,
      name: OMEGA_SECRET.name,
      image: OMEGA_SECRET.image,
      kind: 'omega',
    });
  }
  return out;
}
