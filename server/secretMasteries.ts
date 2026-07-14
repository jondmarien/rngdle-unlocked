/**
 * Lightweight secret mastery evaluation for API (no game catalog import).
 * Section badge ID lists live in sectionBadgeIds.ts (regenerate via
 * `pnpm exec tsx scripts/dump-section-ids.mts`).
 */
import { sectionBadgeIds, type SectionKey } from './sectionBadgeIds.js';

export type SecretSeal = {
  id: string;
  name: string;
  emoji: string;
  image: string;
  tier: 'section' | 'omega';
  section: string;
  ep: number;
};

const SECTION_SEALS: {
  section: SectionKey;
  id: string;
  name: string;
  emoji: string;
  image: string;
  ep: number;
}[] = [
  {
    section: 'math',
    id: 'secret-master-math',
    name: 'Theorem Complete',
    emoji: '📐',
    image: '/secrets/math.jpg',
    ep: 2_500,
  },
  {
    section: 'pattern',
    id: 'secret-master-pattern',
    name: 'Pattern Weaver',
    emoji: '🧩',
    image: '/secrets/pattern.jpg',
    ep: 2_500,
  },
  {
    section: 'void',
    id: 'secret-master-void',
    name: 'Voidwalker',
    emoji: '🕳️',
    image: '/secrets/void.jpg',
    ep: 2_000,
  },
  {
    section: 'cultural',
    id: 'secret-master-cultural',
    name: 'Lorekeeper',
    emoji: '📜',
    image: '/secrets/cultural.jpg',
    ep: 3_000,
  },
  {
    section: 'magnitude',
    id: 'secret-master-magnitude',
    name: 'Scale Breaker',
    emoji: '📏',
    image: '/secrets/magnitude.jpg',
    ep: 2_000,
  },
  {
    section: 'sequence',
    id: 'secret-master-sequence',
    name: 'Sequence Sovereign',
    emoji: '🔢',
    image: '/secrets/sequence.jpg',
    ep: 2_000,
  },
  {
    section: 'poker',
    id: 'secret-master-poker',
    name: 'Full House Master',
    emoji: '🃏',
    image: '/secrets/poker.jpg',
    ep: 2_500,
  },
  {
    section: 'element',
    id: 'secret-master-element',
    name: 'Periodic Crown',
    emoji: '⚛️',
    image: '/secrets/element.jpg',
    ep: 2_500,
  },
  {
    section: 'bases',
    id: 'secret-master-bases',
    name: 'Radix Crown',
    emoji: '🔢',
    image: '/secrets/bases.jpg',
    ep: 2_500,
  },
  {
    section: 'years',
    id: 'secret-master-years',
    name: 'Chronarch',
    emoji: '⏳',
    image: '/secrets/years.jpg',
    ep: 2_500,
  },
  {
    section: 'journey',
    id: 'secret-master-journey',
    name: 'Path Eternal',
    emoji: '🛤️',
    image: '/secrets/journey.jpg',
    ep: 5_000,
  },
];

const OMEGA: SecretSeal = {
  id: 'secret-omega-codex',
  name: 'Codex Absolute',
  emoji: '✨',
  image: '/secrets/omega.jpg',
  tier: 'omega',
  section: 'omega',
  ep: 50_000,
};

function sectionComplete(section: SectionKey, unlocked: Set<string>): boolean {
  const need = [...sectionBadgeIds[section]];
  if (need.length === 0) return false;
  return need.every((id) => unlocked.has(id));
}

export function sectionProgress(
  section: SectionKey,
  unlocked: Set<string>,
): { have: number; total: number } {
  const need = [...sectionBadgeIds[section]];
  const have = need.filter((id) => unlocked.has(id)).length;
  return { have, total: need.length };
}

/** Return only earned secret seals (section + optional omega). */
export function earnedSecretSeals(unlockedIds: Set<string>): SecretSeal[] {
  const earned: SecretSeal[] = [];

  for (const s of SECTION_SEALS) {
    if (sectionComplete(s.section, unlockedIds) || unlockedIds.has(s.id)) {
      earned.push({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        image: s.image,
        tier: 'section',
        section: s.section,
        ep: s.ep,
      });
    }
  }

  // Omega: every badge in every section + every section seal
  const allSections = SECTION_SEALS.every(
    (s) => sectionComplete(s.section, unlockedIds) || unlockedIds.has(s.id),
  );
  const allBadges = (Object.keys(sectionBadgeIds) as SectionKey[]).every(
    (sec) => sectionComplete(sec, unlockedIds),
  );
  const allSeals = SECTION_SEALS.every(
    (s) => earned.some((e) => e.id === s.id) || unlockedIds.has(s.id),
  );

  if ((allSections && allBadges && allSeals) || unlockedIds.has(OMEGA.id)) {
    earned.push(OMEGA);
  }

  return earned;
}

export function parseCollectionIds(raw: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const id = o.badgeId ?? o.id ?? o.badge_id;
    if (typeof id === 'string' && id.length > 0) ids.add(id);
  }
  return ids;
}
