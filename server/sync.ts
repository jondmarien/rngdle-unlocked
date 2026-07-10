import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type {
  CollectionEntry,
  PlayStats,
  RollResult,
} from '../src/game/types.js';
import { ROLL_MAX } from '../src/game/rng.js';
import { defaultPlayStats } from '../src/game/stats.js';
import type { Db } from './db/index.js';
import { rolls, userProgress } from './db/schema.js';
import { createLogger } from './logger.js';
import { processRollActivity } from './rollActivity.js';
import { assertSyncIntegrity } from './syncIntegrity.js';

const log = createLogger('sync');

export type CloudSavePayload = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
};

/**
 * Runtime shape gate for the largest untrusted payload in the app.
 * Deliberately lenient where the merge already normalizes (rarity fallback,
 * percentile clamp, EP/number range skip) so legacy clients keep syncing —
 * this rejects type confusion, not out-of-range values.
 */
const cloudRollSchema = z.looseObject({
  id: z.string().min(1),
  shortCode: z.string().nullish(),
  number: z.number(),
  totalEP: z.number(),
  rarity: z.string(),
  percentile: z.number().nullish(),
  badges: z.array(z.looseObject({})).nullish(),
  rolledAt: z.string(),
  challengeKey: z.string().nullish(),
  source: z.string().nullish(),
  attestationSeal: z.string().nullish(),
});

export const cloudSavePayloadSchema = z.looseObject({
  lifetimeEP: z.number(),
  lifetimeRollCount: z.number(),
  journeyEP: z.number().nullish(),
  collection: z
    .array(
      z.looseObject({
        badgeId: z.string(),
        family: z.string().nullish(),
        firstEarnedAt: z.string().nullish(),
      }),
    )
    .nullish(),
  stats: z.looseObject({}).nullish(),
  history: z.array(cloudRollSchema),
});

const HISTORY_CAP = 500;
/** Cap how many roll rows we write per sync (keeps Vercel under timeout). */
const UPSERT_CAP = 60;

function maxNum(a: number, b: number): number {
  return Math.max(Number(a) || 0, Number(b) || 0);
}

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
  };
}

export function mergeHistory(
  a: RollResult[] | null | undefined,
  b: RollResult[] | null | undefined,
): RollResult[] {
  const map = new Map<string, RollResult>();
  for (const r of [...(a ?? []), ...(b ?? [])]) {
    if (!r?.id) continue;
    const prev = map.get(r.id);
    if (!prev) {
      map.set(r.id, r);
      continue;
    }
    // Prefer row with shortCode / attestation if the other lacks it
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
    .map((r) => {
      let badges: RollResult['badges'] = [];
      try {
        badges = JSON.parse(r.badgesJson || '[]');
      } catch {
        badges = [];
      }
      return {
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
        badges,
        challengeKey: r.challengeKey ?? undefined,
        attestationSeal: r.attestationSeal ?? undefined,
      };
    })
    .sort((a, b) => (a.rolledAt < b.rolledAt ? 1 : -1))
    .slice(0, HISTORY_CAP);

  let collection: CollectionEntry[] = [];
  try {
    collection = JSON.parse(row.collectionJson || '[]');
  } catch {
    collection = [];
  }
  let stats: PlayStats = defaultPlayStats();
  try {
    stats = { ...defaultPlayStats(), ...JSON.parse(row.statsJson || '{}') };
  } catch {
    stats = defaultPlayStats();
  }

  return {
    lifetimeEP: row.lifetimeEp,
    lifetimeRollCount: row.lifetimeRollCount,
    journeyEP: row.journeyEp,
    collection: Array.isArray(collection) ? collection : [],
    stats,
    history,
  };
}

function isUniqueViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('unique') ||
    msg.includes('duplicate key') ||
    msg.includes('23505')
  );
}

async function upsertRoll(
  db: Db,
  values: {
    id: string;
    userId: string;
    number: number;
    totalEp: number;
    rarity: string;
    percentile: number;
    badgesJson: string;
    rolledAt: Date;
    createdAt: Date;
    isPublic: boolean;
    shortCode: string | null;
    challengeKey: string | null;
    attestationSeal: string | null;
    source: string;
  },
): Promise<void> {
  // Never demote a server-ranked row to client via re-sync of the same id.
  const conflictSet = {
    isPublic: true as const,
    shortCode: values.shortCode,
    challengeKey: values.challengeKey,
    attestationSeal: values.attestationSeal,
    // keep score fields fresh if client re-sends
    totalEp: values.totalEp,
    rarity: values.rarity,
    percentile: values.percentile,
    badgesJson: values.badgesJson,
    source: sql`case when ${rolls.source} = 'ranked' then 'ranked' else ${values.source} end`,
  };

  try {
    await db.insert(rolls).values(values).onConflictDoUpdate({
      target: rolls.id,
      set: conflictSet,
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // short_code collision with a different row — retry without code
    log.warn('roll upsert short_code conflict; retrying without code', {
      id: values.id,
      shortCode: values.shortCode,
    });
    await db
      .insert(rolls)
      .values({ ...values, shortCode: null })
      .onConflictDoUpdate({
        target: rolls.id,
        set: {
          ...conflictSet,
          shortCode: null,
        },
      });
  }
}

export async function saveCloudMerge(
  db: Db,
  userId: string,
  local: CloudSavePayload,
): Promise<CloudSavePayload> {
  const cloud = await loadCloudSave(db, userId);
  await assertSyncIntegrity(db, userId, local, cloud);

  const prevCollection = cloud?.collection ?? [];
  const prevRollIds = new Set((cloud?.history ?? []).map((r) => r.id));
  const cloudById = new Map((cloud?.history ?? []).map((r) => [r.id, r]));

  const merged: CloudSavePayload = cloud
    ? {
        lifetimeEP: maxNum(local.lifetimeEP, cloud.lifetimeEP),
        lifetimeRollCount: maxNum(
          local.lifetimeRollCount,
          cloud.lifetimeRollCount,
        ),
        journeyEP: maxNum(local.journeyEP ?? 0, cloud.journeyEP),
        collection: mergeCollection(local.collection, cloud.collection),
        stats: mergeStats(local.stats, cloud.stats),
        history: mergeHistory(local.history, cloud.history),
      }
    : {
        lifetimeEP: Number(local.lifetimeEP) || 0,
        lifetimeRollCount: Number(local.lifetimeRollCount) || 0,
        journeyEP: Number(local.journeyEP) || 0,
        collection: mergeCollection(local.collection, []),
        stats: mergeStats(local.stats, defaultPlayStats()),
        history: mergeHistory(local.history, []),
      };

  const now = new Date();
  await db
    .insert(userProgress)
    .values({
      userId,
      lifetimeEp: merged.lifetimeEP,
      lifetimeRollCount: merged.lifetimeRollCount,
      journeyEp: merged.journeyEP,
      collectionJson: JSON.stringify(merged.collection ?? []),
      statsJson: JSON.stringify(merged.stats ?? defaultPlayStats()),
      settingsJson: '{}',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: {
        lifetimeEp: merged.lifetimeEP,
        lifetimeRollCount: merged.lifetimeRollCount,
        journeyEp: merged.journeyEP,
        collectionJson: JSON.stringify(merged.collection ?? []),
        statsJson: JSON.stringify(merged.stats ?? defaultPlayStats()),
        updatedAt: now,
      },
    });

  // Only write new / changed rolls (not the whole history every sync)
  const candidates = merged.history.filter((r) => {
    if (!r?.id) return false;
    const prev = cloudById.get(r.id);
    if (!prev) return true;
    if (r.shortCode && r.shortCode !== prev.shortCode) return true;
    if (r.attestationSeal && r.attestationSeal !== prev.attestationSeal) {
      return true;
    }
    return false;
  });

  // Prefer newest rolls first so share targets land quickly
  const toUpsert = candidates
    .sort((a, b) => (a.rolledAt < b.rolledAt ? 1 : -1))
    .slice(0, UPSERT_CAP);

  const newlySeenRolls: RollResult[] = [];
  let wrote = 0;
  let failed = 0;

  for (const r of toUpsert) {
    if (r.totalEP < 0 || r.totalEP > 500_000) continue;
    if (r.number < 0 || r.number > ROLL_MAX) continue;

    let rolledAt: Date;
    try {
      rolledAt = new Date(r.rolledAt);
      if (Number.isNaN(rolledAt.getTime())) rolledAt = now;
    } catch {
      rolledAt = now;
    }

    const shortCode =
      r.shortCode && r.shortCode.length >= 6 ? r.shortCode : null;

    // Never let client sync forge "ranked" — only server ranked-roll API sets that.
    const source =
      r.source === 'challenge' ||
      (typeof r.challengeKey === 'string' &&
        (r.challengeKey.startsWith('daily:') ||
          r.challengeKey.startsWith('weekly:')))
        ? 'challenge'
        : 'client';

    const values = {
      id: r.id,
      userId,
      number: r.number,
      totalEp: r.totalEP,
      rarity: r.rarity || 'common',
      percentile: Number.isFinite(r.percentile) ? r.percentile : 50,
      badgesJson: JSON.stringify(Array.isArray(r.badges) ? r.badges : []),
      rolledAt,
      createdAt: now,
      isPublic: true as const,
      shortCode,
      challengeKey: r.challengeKey ?? null,
      attestationSeal: r.attestationSeal ?? null,
      source,
    };

    const isNewRoll = !prevRollIds.has(r.id);

    try {
      await upsertRoll(db, values);
      wrote += 1;
      if (isNewRoll) newlySeenRolls.push(r);
    } catch (err) {
      failed += 1;
      log.error('roll upsert failed', {
        id: r.id,
        err: err instanceof Error ? err.message : String(err),
      });
      // Continue — one bad row must not block the whole sync
    }
  }

  log.info('rolls upserted', {
    userId,
    candidates: candidates.length,
    wrote,
    failed,
    newRolls: newlySeenRolls.length,
  });

  // Side-effects must never fail the sync
  try {
    await processRollActivity(db, {
      userId,
      prevCollection,
      nextCollection: merged.collection,
      prevRollIds,
      newRolls: newlySeenRolls,
    });
  } catch (err) {
    log.error('processRollActivity failed (non-fatal)', {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return merged;
}
