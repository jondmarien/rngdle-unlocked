import type {
  ConsecutiveHighlight,
  PlayStats,
  RarityTier,
  RollHighlight,
  RollResult,
} from './types.js';
import { rollToHighlight } from './types.js';

const QUALITY: RarityTier[] = [
  'uncommon',
  'rare',
  'epic',
  'anomaly',
  'mythic',
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

export function defaultPlayStats(): PlayStats {
  return {
    qualityStreak: 0,
    bestQualityStreak: 0,
    dayStreak: 0,
    bestDayStreak: 0,
    lastPlayDate: null,
    bestRoll: null,
    bestConsecutive: [],
  };
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** Update quality + day streaks after a roll. */
export function applyStreaks(stats: PlayStats, roll: RollResult, now = new Date()): PlayStats {
  const next = { ...stats };
  const today = localDateKey(now);

  // Quality streak
  if (isQualityRarity(roll.rarity)) {
    next.qualityStreak = stats.qualityStreak + 1;
    next.bestQualityStreak = Math.max(stats.bestQualityStreak, next.qualityStreak);
  } else {
    next.qualityStreak = 0;
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

export function mergeBestRoll(
  current: RollHighlight | null,
  incoming: RollHighlight | null,
): RollHighlight | null {
  if (!current) return incoming;
  if (!incoming) return current;
  if (incoming.totalEP > current.totalEP) return incoming;
  if (incoming.totalEP === current.totalEP && incoming.percentile > current.percentile) {
    return incoming;
  }
  return current;
}
