import { badgeRarityFromEP } from './rarity.js';
import type { SecretBadgeDef } from './secrets.js';
import { giantNumbersHit } from './stats.js';
import type {
  BadgeHit,
  CollectionEntry,
  PlayStats,
  RollResult,
} from './types.js';

/** Meta secrets unlocked from parity streaks / giant windows — not omega gates. */
export const STREAK_SECRETS: SecretBadgeDef[] = [
  {
    id: 'secret-streak-odd-5',
    name: 'Very Odd',
    description: 'Five consecutive odd rolls.',
    ep: 1_500,
    family: 'secret',
    emoji: '🔮',
    image: '/secrets/streak-odd-5.jpg',
    section: 'streak',
    tier: 'streak',
  },
  {
    id: 'secret-streak-odd-10',
    name: 'Extremely Odd',
    description: 'Ten consecutive odd rolls.',
    ep: 3_000,
    family: 'secret',
    emoji: '🌀',
    image: '/secrets/streak-odd-10.jpg',
    section: 'streak',
    tier: 'streak',
  },
  {
    id: 'secret-streak-even-5',
    name: 'Uneven',
    description: 'Five consecutive even rolls.',
    ep: 1_500,
    family: 'secret',
    emoji: '⚖️',
    image: '/secrets/streak-even-5.jpg',
    section: 'streak',
    tier: 'streak',
  },
  {
    id: 'secret-streak-even-10',
    name: 'Very Uneven',
    description: 'Ten consecutive even rolls.',
    ep: 3_000,
    family: 'secret',
    emoji: '〰️',
    image: '/secrets/streak-even-10.jpg',
    section: 'streak',
    tier: 'streak',
  },
  {
    id: 'secret-giant-numbers',
    name: 'Giant Numbers',
    description: 'Your last five rolls sum to more than 4,000,000.',
    ep: 2_500,
    family: 'secret',
    emoji: '🏔️',
    image: '/secrets/giant-numbers.jpg',
    section: 'streak',
    tier: 'streak',
  },
];

function isEligible(
  secret: SecretBadgeDef,
  stats: PlayStats,
  historyNewestFirst: RollResult[],
): boolean {
  switch (secret.id) {
    case 'secret-streak-odd-5':
      return stats.oddStreak >= 5;
    case 'secret-streak-odd-10':
      return stats.oddStreak >= 10;
    case 'secret-streak-even-5':
      return stats.evenStreak >= 5;
    case 'secret-streak-even-10':
      return stats.evenStreak >= 10;
    case 'secret-giant-numbers':
      return giantNumbersHit(historyNewestFirst);
    default:
      return false;
  }
}

export function newlyUnlockedStreakSecrets(
  stats: PlayStats,
  historyNewestFirst: RollResult[],
  unlockedIds: Set<string>,
): SecretBadgeDef[] {
  return STREAK_SECRETS.filter(
    (s) => !unlockedIds.has(s.id) && isEligible(s, stats, historyNewestFirst),
  );
}

export function streakSecretHits(defs: SecretBadgeDef[]): BadgeHit[] {
  return defs.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    ep: b.ep,
    family: 'secret' as const,
    emoji: b.emoji,
    highlights: [],
    rarity: badgeRarityFromEP(b.ep),
    ...(b.image ? { image: b.image } : {}),
  }));
}

export function sumStreakSecretEP(defs: SecretBadgeDef[]): number {
  return defs.reduce((a, b) => a + b.ep, 0);
}

/** Append newly earned streak/giant secrets (collection add-only). */
export function mergeStreakUnlocks(
  collection: CollectionEntry[],
  stats: PlayStats,
  historyNewestFirst: RollResult[],
  at: string = new Date().toISOString(),
): { collection: CollectionEntry[]; unlocked: SecretBadgeDef[]; ep: number } {
  const ids = new Set(collection.map((c) => c.badgeId));
  const unlocked = newlyUnlockedStreakSecrets(stats, historyNewestFirst, ids);
  if (unlocked.length === 0) {
    return { collection, unlocked: [], ep: 0 };
  }
  const next = [...collection];
  for (const s of unlocked) {
    next.push({
      badgeId: s.id,
      firstEarnedAt: at,
      family: 'secret',
    });
  }
  return {
    collection: next,
    unlocked,
    ep: sumStreakSecretEP(unlocked),
  };
}
