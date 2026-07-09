import { NUMBER_BADGES } from './badges/catalog.js';
import { JOURNEY_BADGES } from './journey.js';
import { badgeRarityFromEP } from './rarity.js';
import type { BadgeFamily, BadgeHit, CollectionEntry } from './types.js';

/** Number families that grant a section mastery secret when fully collected. */
export const SECTION_FAMILIES = [
  'math',
  'pattern',
  'void',
  'cultural',
  'magnitude',
  'sequence',
  'poker',
  'element',
] as const satisfies readonly Exclude<BadgeFamily, 'journey' | 'secret'>[];

export type SectionFamily = (typeof SECTION_FAMILIES)[number] | 'journey';

export type SecretBadgeDef = {
  id: string;
  name: string;
  description: string;
  ep: number;
  family: 'secret';
  emoji: string;
  /** Public path to custom Grok Imagine art under /public/secrets */
  image: string;
  /** Codex section this secret completes; omega completes all sections. */
  section: SectionFamily | 'omega';
  /** Fancy tier for UI chrome */
  tier: 'section' | 'omega';
};

const SECTION_META: Record<
  SectionFamily,
  {
    id: string;
    name: string;
    emoji: string;
    ep: number;
    blurb: string;
    image: string;
  }
> = {
  math: {
    id: 'secret-master-math',
    name: 'Theorem Complete',
    emoji: '📐',
    ep: 2_500,
    blurb: 'Every mathematical property in the codex is yours.',
    image: '/secrets/math.jpg',
  },
  pattern: {
    id: 'secret-master-pattern',
    name: 'Pattern Weaver',
    emoji: '🧩',
    ep: 2_500,
    blurb: 'Every digit pattern has revealed itself to you.',
    image: '/secrets/pattern.jpg',
  },
  void: {
    id: 'secret-master-void',
    name: 'Voidwalker',
    emoji: '🕳️',
    ep: 2_000,
    blurb: 'You catalogued the emptiness between the digits.',
    image: '/secrets/void.jpg',
  },
  cultural: {
    id: 'secret-master-cultural',
    name: 'Lorekeeper',
    emoji: '📜',
    ep: 3_000,
    blurb: 'Every storied number in the codex is collected.',
    image: '/secrets/cultural.jpg',
  },
  magnitude: {
    id: 'secret-master-magnitude',
    name: 'Scale Breaker',
    emoji: '📏',
    ep: 2_000,
    blurb: 'From dust to dominion, every magnitude badge is yours.',
    image: '/secrets/magnitude.jpg',
  },
  sequence: {
    id: 'secret-master-sequence',
    name: 'Sequence Sovereign',
    emoji: '🔢',
    ep: 2_000,
    blurb: 'Runs, steps, and ordered digits bow to your collection.',
    image: '/secrets/sequence.jpg',
  },
  poker: {
    id: 'secret-master-poker',
    name: 'Full House Master',
    emoji: '🃏',
    ep: 2_500,
    blurb: 'Every poker hand in the digit deck is claimed.',
    image: '/secrets/poker.jpg',
  },
  element: {
    id: 'secret-master-element',
    name: 'Periodic Crown',
    emoji: '⚛️',
    ep: 2_500,
    blurb: 'The full table of element badges is complete.',
    image: '/secrets/element.jpg',
  },
  journey: {
    id: 'secret-master-journey',
    name: 'Path Eternal',
    emoji: '🛤️',
    ep: 5_000,
    blurb: 'Every lifetime journey milestone has been walked.',
    image: '/secrets/journey.jpg',
  },
};

export const OMEGA_SECRET: SecretBadgeDef = {
  id: 'secret-omega-codex',
  name: 'Codex Absolute',
  description:
    'Every number badge, every journey mark, and every section mastery. The codex is complete. This is the final seal.',
  ep: 50_000,
  family: 'secret',
  emoji: '✨',
  image: '/secrets/omega.jpg',
  section: 'omega',
  tier: 'omega',
};

export const SECTION_SECRETS: SecretBadgeDef[] = (
  Object.keys(SECTION_META) as SectionFamily[]
).map((section) => {
  const m = SECTION_META[section];
  return {
    id: m.id,
    name: m.name,
    description: m.blurb,
    ep: m.ep,
    family: 'secret' as const,
    emoji: m.emoji,
    image: m.image,
    section,
    tier: 'section' as const,
  };
});

export const SECRET_BADGES: SecretBadgeDef[] = [
  ...SECTION_SECRETS,
  OMEGA_SECRET,
];

export function secretById(id: string): SecretBadgeDef | undefined {
  return SECRET_BADGES.find((s) => s.id === id);
}

function idsForSection(section: SectionFamily): string[] {
  if (section === 'journey') {
    return JOURNEY_BADGES.map((b) => b.id);
  }
  return NUMBER_BADGES.filter((b) => b.family === section).map((b) => b.id);
}

/** Whether the player has unlocked every badge required for a section mastery. */
export function isSectionComplete(
  section: SectionFamily,
  unlockedIds: Set<string>,
): boolean {
  const need = idsForSection(section);
  if (need.length === 0) return false;
  return need.every((id) => unlockedIds.has(id));
}

export function sectionProgress(
  section: SectionFamily,
  unlockedIds: Set<string>,
): { have: number; total: number } {
  const need = idsForSection(section);
  const have = need.filter((id) => unlockedIds.has(id)).length;
  return { have, total: need.length };
}

/**
 * Secrets that *should* be owned given the current collection
 * (section masters + omega when every badge + every section secret is earned).
 */
export function evaluateOwnedSecrets(
  unlockedIds: Set<string>,
): SecretBadgeDef[] {
  const owned: SecretBadgeDef[] = [];
  for (const secret of SECTION_SECRETS) {
    if (
      secret.section !== 'omega' &&
      isSectionComplete(secret.section, unlockedIds)
    ) {
      owned.push(secret);
    }
  }

  const withSections = new Set(unlockedIds);
  for (const s of owned) withSections.add(s.id);

  const allNumber = NUMBER_BADGES.every((b) => withSections.has(b.id));
  const allJourney = JOURNEY_BADGES.every((b) => withSections.has(b.id));
  const allSectionSecrets = SECTION_SECRETS.every((s) =>
    withSections.has(s.id),
  );

  if (allNumber && allJourney && allSectionSecrets) {
    owned.push(OMEGA_SECRET);
  }
  return owned;
}

/** Secrets newly earned: eligible now but not yet in the collection set. */
export function newlyUnlockedSecrets(
  unlockedIds: Set<string>,
): SecretBadgeDef[] {
  return evaluateOwnedSecrets(unlockedIds).filter(
    (s) => !unlockedIds.has(s.id),
  );
}

export function secretHits(defs: SecretBadgeDef[]): BadgeHit[] {
  return defs.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    ep: b.ep,
    family: 'secret',
    emoji: b.emoji,
    highlights: [],
    rarity: badgeRarityFromEP(b.ep),
  }));
}

export function sumSecretEP(defs: SecretBadgeDef[]): number {
  return defs.reduce((a, b) => a + b.ep, 0);
}

/** Reconcile collection: append any missing secrets that are already earned. */
export function mergeSecretUnlocks(
  collection: CollectionEntry[],
  at: string = new Date().toISOString(),
): { collection: CollectionEntry[]; unlocked: SecretBadgeDef[]; ep: number } {
  const ids = new Set(collection.map((c) => c.badgeId));
  // Iterate: unlocking a section secret can enable omega in a second pass
  let unlocked: SecretBadgeDef[] = [];
  let next = [...collection];
  let guard = 0;
  while (guard++ < 4) {
    const batch = newlyUnlockedSecrets(ids);
    if (batch.length === 0) break;
    for (const s of batch) {
      ids.add(s.id);
      next.push({
        badgeId: s.id,
        firstEarnedAt: at,
        family: 'secret',
      });
      unlocked.push(s);
    }
  }
  return {
    collection: next,
    unlocked,
    ep: sumSecretEP(unlocked),
  };
}
