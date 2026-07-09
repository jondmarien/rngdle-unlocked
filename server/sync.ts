import { eq } from 'drizzle-orm';
import type { CollectionEntry, PlayStats, RollResult } from '../src/game/types.js';
import { defaultPlayStats } from '../src/game/stats.js';
import type { Db } from './db/index.js';
import { rolls, userProgress } from './db/schema.js';

export type CloudSavePayload = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
};

const HISTORY_CAP = 500;

function maxNum(a: number, b: number): number {
  return Math.max(Number(a) || 0, Number(b) || 0);
}

export function mergeCollection(
  a: CollectionEntry[],
  b: CollectionEntry[],
): CollectionEntry[] {
  const map = new Map<string, CollectionEntry>();
  for (const e of [...a, ...b]) {
    const prev = map.get(e.badgeId);
    if (!prev) {
      map.set(e.badgeId, e);
      continue;
    }
    // Earliest firstEarnedAt wins
    if (e.firstEarnedAt < prev.firstEarnedAt) {
      map.set(e.badgeId, e);
    }
  }
  return [...map.values()];
}

export function mergeStats(a: PlayStats, b: PlayStats): PlayStats {
  const bestRoll =
    !a.bestRoll
      ? b.bestRoll
      : !b.bestRoll
        ? a.bestRoll
        : b.bestRoll.totalEP > a.bestRoll.totalEP
          ? b.bestRoll
          : a.bestRoll;

  return {
    qualityStreak: Math.max(a.qualityStreak, b.qualityStreak),
    bestQualityStreak: Math.max(a.bestQualityStreak, b.bestQualityStreak),
    dayStreak: Math.max(a.dayStreak, b.dayStreak),
    bestDayStreak: Math.max(a.bestDayStreak, b.bestDayStreak),
    lastPlayDate:
      (a.lastPlayDate ?? '') > (b.lastPlayDate ?? '')
        ? a.lastPlayDate
        : b.lastPlayDate,
    bestRoll,
    bestConsecutive:
      a.bestConsecutive.length >= b.bestConsecutive.length
        ? a.bestConsecutive
        : b.bestConsecutive,
  };
}

export function mergeHistory(a: RollResult[], b: RollResult[]): RollResult[] {
  const map = new Map<string, RollResult>();
  for (const r of [...a, ...b]) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  return [...map.values()]
    .sort((x, y) => (x.rolledAt < y.rolledAt ? 1 : -1))
    .slice(0, HISTORY_CAP);
}

export async function loadCloudSave(
  db: Db,
  userId: string,
): Promise<CloudSavePayload | null> {
  const [row] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);

  if (!row) return null;

  const historyRows = await db
    .select()
    .from(rolls)
    .where(eq(rolls.userId, userId));

  const history: RollResult[] = historyRows
    .map((r) => ({
      id: r.id,
      shortCode: r.shortCode ?? undefined,
      number: r.number,
      totalEP: r.totalEp,
      rarity: r.rarity as RollResult['rarity'],
      percentile: r.percentile,
      rolledAt:
        r.rolledAt instanceof Date
          ? r.rolledAt.toISOString()
          : String(r.rolledAt),
      badges: JSON.parse(r.badgesJson || '[]'),
    }))
    .sort((a, b) => (a.rolledAt < b.rolledAt ? 1 : -1))
    .slice(0, HISTORY_CAP);

  return {
    lifetimeEP: row.lifetimeEp,
    lifetimeRollCount: row.lifetimeRollCount,
    journeyEP: row.journeyEp,
    collection: JSON.parse(row.collectionJson || '[]'),
    stats: { ...defaultPlayStats(), ...JSON.parse(row.statsJson || '{}') },
    history,
  };
}

export async function saveCloudMerge(
  db: Db,
  userId: string,
  local: CloudSavePayload,
): Promise<CloudSavePayload> {
  const cloud = await loadCloudSave(db, userId);

  const merged: CloudSavePayload = cloud
    ? {
        lifetimeEP: maxNum(local.lifetimeEP, cloud.lifetimeEP),
        lifetimeRollCount: maxNum(
          local.lifetimeRollCount,
          cloud.lifetimeRollCount,
        ),
        journeyEP: maxNum(local.journeyEP, cloud.journeyEP),
        collection: mergeCollection(local.collection, cloud.collection),
        stats: mergeStats(local.stats, cloud.stats),
        history: mergeHistory(local.history, cloud.history),
      }
    : {
        ...local,
        history: local.history.slice(0, HISTORY_CAP),
      };

  const now = new Date();
  await db
    .insert(userProgress)
    .values({
      userId,
      lifetimeEp: merged.lifetimeEP,
      lifetimeRollCount: merged.lifetimeRollCount,
      journeyEp: merged.journeyEP,
      collectionJson: JSON.stringify(merged.collection),
      statsJson: JSON.stringify(merged.stats),
      settingsJson: '{}',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: {
        lifetimeEp: merged.lifetimeEP,
        lifetimeRollCount: merged.lifetimeRollCount,
        journeyEp: merged.journeyEP,
        collectionJson: JSON.stringify(merged.collection),
        statsJson: JSON.stringify(merged.stats),
        updatedAt: now,
      },
    });

  // Soft fairness: cap how many new rolls we accept in one sync burst
  const toUpsert = merged.history.slice(0, 200);

  for (const r of toUpsert) {
    // Sanity: reject absurd EP (anti-cheat soft bound)
    if (r.totalEP < 0 || r.totalEP > 500_000) continue;
    if (r.number < 0 || r.number > 1_000_000) continue;

    const shortCode =
      r.shortCode && r.shortCode.length >= 6 ? r.shortCode : null;

    const values = {
      id: r.id,
      userId,
      number: r.number,
      totalEp: r.totalEP,
      rarity: r.rarity,
      percentile: r.percentile,
      badgesJson: JSON.stringify(r.badges),
      rolledAt: new Date(r.rolledAt),
      createdAt: now,
      isPublic: true as const,
      shortCode,
    };

    if (shortCode) {
      await db
        .insert(rolls)
        .values(values)
        .onConflictDoUpdate({
          target: rolls.id,
          set: { isPublic: true, shortCode },
        });
    } else {
      await db.insert(rolls).values(values).onConflictDoNothing();
    }
  }

  return merged;
}
