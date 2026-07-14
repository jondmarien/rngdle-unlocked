/**
 * Pure sync merge helpers shared by client pull and server saveCloudMerge.
 * No React / DB imports — safe for Vite and Node (use .js extensions from server).
 */
import type { CollectionEntry, PlayStats, RollResult } from '../game/types.js';
import { defaultPlayStats, mergeRarityCounts } from '../game/stats.js';

export const SYNC_HISTORY_CAP = 500;

function maxNum(a: number, b: number): number {
  return Math.max(Number(a) || 0, Number(b) || 0);
}

export { maxNum };

export function mergeCollection(
  a: CollectionEntry[] | null | undefined,
  b: CollectionEntry[] | null | undefined,
): CollectionEntry[] {
  const map = new Map<string, CollectionEntry>();
  for (const e of [...(a ?? []), ...(b ?? [])]) {
    if (!e?.badgeId) continue;
    const prev = map.get(e.badgeId);
    if (!prev) {
      map.set(e.badgeId, {
        badgeId: e.badgeId,
        family: e.family,
        firstEarnedAt: e.firstEarnedAt || new Date(0).toISOString(),
      });
      continue;
    }
    const ea = e.firstEarnedAt || '';
    const pa = prev.firstEarnedAt || '';
    if (ea && (!pa || ea < pa)) {
      map.set(e.badgeId, {
        badgeId: e.badgeId,
        family: e.family ?? prev.family,
        firstEarnedAt: ea,
      });
    }
  }
  return [...map.values()];
}

export function mergeStats(
  a: PlayStats | null | undefined,
  b: PlayStats | null | undefined,
): PlayStats {
  const left = { ...defaultPlayStats(), ...a };
  const right = { ...defaultPlayStats(), ...b };

  const bestRoll = !left.bestRoll
    ? right.bestRoll
    : !right.bestRoll
      ? left.bestRoll
      : right.bestRoll.totalEP > left.bestRoll.totalEP
        ? right.bestRoll
        : left.bestRoll;

  return {
    qualityStreak: Math.max(left.qualityStreak, right.qualityStreak),
    bestQualityStreak: Math.max(
      left.bestQualityStreak,
      right.bestQualityStreak,
    ),
    dayStreak: Math.max(left.dayStreak, right.dayStreak),
    bestDayStreak: Math.max(left.bestDayStreak, right.bestDayStreak),
    lastPlayDate:
      (left.lastPlayDate ?? '') > (right.lastPlayDate ?? '')
        ? left.lastPlayDate
        : right.lastPlayDate,
    bestRoll,
    bestConsecutive:
      (left.bestConsecutive?.length ?? 0) >=
      (right.bestConsecutive?.length ?? 0)
        ? (left.bestConsecutive ?? [])
        : (right.bestConsecutive ?? []),
    // Current parity streaks are never Math.max'd — client recomputes from history.
    oddStreak: 0,
    evenStreak: 0,
    bestOddStreak: Math.max(left.bestOddStreak ?? 0, right.bestOddStreak ?? 0),
    bestEvenStreak: Math.max(
      left.bestEvenStreak ?? 0,
      right.bestEvenStreak ?? 0,
    ),
    lifetimeRarityCounts: mergeRarityCounts(
      left.lifetimeRarityCounts,
      right.lifetimeRarityCounts,
    ),
  };
}

export function mergeHistory(
  a: RollResult[] | null | undefined,
  b: RollResult[] | null | undefined,
  historyCap = SYNC_HISTORY_CAP,
): RollResult[] {
  const map = new Map<string, RollResult>();
  for (const r of [...(a ?? []), ...(b ?? [])]) {
    if (!r?.id) continue;
    const prev = map.get(r.id);
    if (!prev) {
      map.set(r.id, r);
      continue;
    }
    map.set(r.id, {
      ...prev,
      ...r,
      shortCode: r.shortCode || prev.shortCode,
      attestationSeal: r.attestationSeal || prev.attestationSeal,
      badges: r.badges?.length ? r.badges : prev.badges,
    });
  }
  return [...map.values()]
    .sort((x, y) => (x.rolledAt < y.rolledAt ? 1 : -1))
    .slice(0, historyCap);
}
