import type {
  ConsecutiveHighlight,
  PlayStats,
  RarityTier,
  RollResult,
} from './types.js';
import { rollToHighlight } from './types.js';
import { utcDateKey } from './challenge.js';

const QUALITY: RarityTier[] = [
  'uncommon',
  'rare',
  'epic',
  'anomaly',
  'mythic',
  'divine',
];

const WINDOWS = [3, 5, 10] as const;

export function isQualityRarity(r: RarityTier): boolean {
  return QUALITY.includes(r);
}

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function emptyRarityCounts(): Record<RarityTier, number> {
  return {
    trash: 0,
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    anomaly: 0,
    mythic: 0,
    divine: 0,
  };
}

export function defaultPlayStats(): PlayStats {
  return {
    qualityStreak: 0,
    bestQualityStreak: 0,
    dayStreak: 0,
    bestDayStreak: 0,
    lastPlayDate: null,
    bestRoll: null,
    bestConsecutive: [],
    oddStreak: 0,
    bestOddStreak: 0,
    evenStreak: 0,
    bestEvenStreak: 0,
    lifetimeRarityCounts: emptyRarityCounts(),
  };
}

/** Max-merge rarity counters (sync / import). */
export function mergeRarityCounts(
  a: Partial<Record<RarityTier, number>> | null | undefined,
  b: Partial<Record<RarityTier, number>> | null | undefined,
): Record<RarityTier, number> {
  const out = emptyRarityCounts();
  for (const tier of Object.keys(out) as RarityTier[]) {
    out[tier] = Math.max(Number(a?.[tier]) || 0, Number(b?.[tier]) || 0);
  }
  return out;
}

/** Ensure counters exist; backfill from history when sum is behind the window. */
export function ensureLifetimeRarityCounts(
  stats: PlayStats,
  history: RollResult[],
): PlayStats {
  const current = mergeRarityCounts(
    emptyRarityCounts(),
    stats.lifetimeRarityCounts,
  );
  const fromHistory = emptyRarityCounts();
  for (const r of history) {
    const tier = r.rarity;
    if (tier in fromHistory) {
      fromHistory[tier] += 1;
    }
  }
  return {
    ...stats,
    lifetimeRarityCounts: mergeRarityCounts(current, fromHistory),
  };
}

export function bumpLifetimeRarity(
  stats: PlayStats,
  rarity: RarityTier,
): PlayStats {
  const counts = mergeRarityCounts(
    emptyRarityCounts(),
    stats.lifetimeRarityCounts,
  );
  counts[rarity] = (counts[rarity] ?? 0) + 1;
  return { ...stats, lifetimeRarityCounts: counts };
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00.000Z');
  const db = new Date(b + 'T12:00:00.000Z');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** Update quality + day streaks after a roll. */
export function applyStreaks(
  stats: PlayStats,
  roll: RollResult,
  now = new Date(),
): PlayStats {
  const next = { ...stats };
  const today = utcDateKey(now);

  // Quality streak
  if (isQualityRarity(roll.rarity)) {
    next.qualityStreak = stats.qualityStreak + 1;
    next.bestQualityStreak = Math.max(
      stats.bestQualityStreak,
      next.qualityStreak,
    );
  } else {
    next.qualityStreak = 0;
  }

  // Parity streaks (0 is even)
  if (roll.number % 2 === 1) {
    next.oddStreak = stats.oddStreak + 1;
    next.evenStreak = 0;
    next.bestOddStreak = Math.max(stats.bestOddStreak, next.oddStreak);
  } else {
    next.evenStreak = stats.evenStreak + 1;
    next.oddStreak = 0;
    next.bestEvenStreak = Math.max(stats.bestEvenStreak, next.evenStreak);
  }

  // Day streak
  if (stats.lastPlayDate === today) {
    // same day — keep streak
  } else if (stats.lastPlayDate && dayDiff(stats.lastPlayDate, today) === 1) {
    next.dayStreak = stats.dayStreak + 1;
  } else if (stats.lastPlayDate && dayDiff(stats.lastPlayDate, today) === 0) {
    // same
  } else {
    next.dayStreak = 1;
  }
  next.bestDayStreak = Math.max(stats.bestDayStreak, next.dayStreak, 1);
  next.lastPlayDate = today;

  // Best single roll by EP
  const highlight = rollToHighlight(roll);
  if (!stats.bestRoll || highlight.totalEP > stats.bestRoll.totalEP) {
    next.bestRoll = highlight;
  } else if (
    stats.bestRoll &&
    highlight.totalEP === stats.bestRoll.totalEP &&
    highlight.percentile > stats.bestRoll.percentile
  ) {
    next.bestRoll = highlight;
  }

  return next;
}

/** Recompute best consecutive EP windows from newest-first history. */
export function recomputeBestConsecutive(
  historyNewestFirst: RollResult[],
  previous: ConsecutiveHighlight[] = [],
): ConsecutiveHighlight[] {
  const chrono = [...historyNewestFirst].reverse();
  const found: ConsecutiveHighlight[] = [];

  for (const size of WINDOWS) {
    if (chrono.length < size) {
      const prev = previous.find((p) => p.windowSize === size);
      if (prev) found.push(prev);
      continue;
    }
    let bestSum = -1;
    let bestStart = 0;
    for (let i = 0; i <= chrono.length - size; i++) {
      let sum = 0;
      for (let j = 0; j < size; j++) sum += chrono[i + j]!.totalEP;
      if (sum > bestSum) {
        bestSum = sum;
        bestStart = i;
      }
    }
    const slice = chrono.slice(bestStart, bestStart + size);
    const candidate: ConsecutiveHighlight = {
      windowSize: size,
      totalEP: bestSum,
      avgEP: Math.round(bestSum / size),
      fromAt: slice[0]!.rolledAt,
      toAt: slice[slice.length - 1]!.rolledAt,
      rolls: slice.map(rollToHighlight),
    };
    const prev = previous.find((p) => p.windowSize === size);
    if (prev && prev.totalEP > candidate.totalEP) {
      found.push(prev);
    } else {
      found.push(candidate);
    }
  }
  return found;
}

export type ParityStreaks = {
  oddStreak: number;
  evenStreak: number;
  bestOddStreak: number;
  bestEvenStreak: number;
};

/** Recompute current + best parity streaks from newest-first history. */
export function recomputeParityStreaks(
  historyNewestFirst: Pick<RollResult, 'number'>[],
): ParityStreaks {
  const chrono = [...historyNewestFirst].reverse();
  let oddStreak = 0;
  let evenStreak = 0;
  let bestOddStreak = 0;
  let bestEvenStreak = 0;

  for (const r of chrono) {
    if (r.number % 2 === 1) {
      oddStreak += 1;
      evenStreak = 0;
      bestOddStreak = Math.max(bestOddStreak, oddStreak);
    } else {
      evenStreak += 1;
      oddStreak = 0;
      bestEvenStreak = Math.max(bestEvenStreak, evenStreak);
    }
  }

  return { oddStreak, evenStreak, bestOddStreak, bestEvenStreak };
}

/**
 * Patch bestConsecutive + parity currents/bests from history.
 * Call after sync/import merge so current streaks never flash to 0 in UI.
 */
export function finalizeStatsFromHistory(
  stats: PlayStats,
  historyNewestFirst: RollResult[],
): PlayStats {
  const parity = recomputeParityStreaks(historyNewestFirst);
  return {
    ...stats,
    bestConsecutive: recomputeBestConsecutive(
      historyNewestFirst,
      stats.bestConsecutive,
    ),
    oddStreak: parity.oddStreak,
    evenStreak: parity.evenStreak,
    bestOddStreak: Math.max(stats.bestOddStreak, parity.bestOddStreak),
    bestEvenStreak: Math.max(stats.bestEvenStreak, parity.bestEvenStreak),
  };
}

/** Sum of `number` over the most recent 5 rolls (newest-first) > 4_000_000. */
export function giantNumbersHit(
  historyNewestFirst: Pick<RollResult, 'number'>[],
): boolean {
  if (historyNewestFirst.length < 5) return false;
  let sum = 0;
  for (let i = 0; i < 5; i++) sum += historyNewestFirst[i]!.number;
  return sum > 4_000_000;
}
