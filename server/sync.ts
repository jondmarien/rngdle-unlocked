import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type {
  CollectionEntry,
  PlayStats,
  RollResult,
} from '../src/game/types.js';
import { ROLL_MAX } from '../src/game/rng.js';
import { defaultPlayStats } from '../src/game/stats.js';
import {
  maxNum,
  mergeCollection,
  mergeHistory,
  mergeStats,
  SYNC_HISTORY_CAP,
} from '../src/lib/sync-merge.js';
import type { Db } from './db/index.js';
import { rolls, userProgress } from './db/schema.js';
import { createLogger } from './logger.js';
import { processRollActivity } from './rollActivity.js';
import { assertSyncIntegrity } from './syncIntegrity.js';
import {
  mergeSettingsLww,
  parseCloudSettingsJson,
  pickSyncableSettings,
  serializeCloudSettingsBlob,
  type CloudSettingsBlob,
} from './syncSettings.js';

const log = createLogger('sync');

export { mergeCollection, mergeHistory, mergeStats };
export const HISTORY_CAP = SYNC_HISTORY_CAP;

export const MAX_SYNC_PAYLOAD_BYTES = 256 * 1024;

export function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function syncPayloadTooLargeResponse(sizeBytes: number): Response {
  return Response.json(
    {
      error: 'Sync payload too large',
      detail: `Sync payload is ${sizeBytes} bytes; max is ${MAX_SYNC_PAYLOAD_BYTES} bytes. Pull from cloud or wait for the next incremental sync.`,
      code: 'SYNC_PAYLOAD_TOO_LARGE',
      maxBytes: MAX_SYNC_PAYLOAD_BYTES,
      sizeBytes,
    },
    { status: 413 },
  );
}

function rollSourceFromDb(
  source: string | null | undefined,
): RollResult['source'] {
  if (source === 'ranked' || source === 'challenge' || source === 'client') {
    return source;
  }
  return undefined;
}

export type CloudSavePayload = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
  /** Present only when settings_sync_enabled; allowlisted prefs + LWW stamp. */
  settings?: Partial<import('../src/game/types.js').AppSettings>;
  settingsUpdatedAt?: string;
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
  settings: z.looseObject({}).nullish(),
  settingsUpdatedAt: z.string().nullish(),
});

/** Cap how many roll rows we write per sync (keeps Vercel under timeout). */
export const UPSERT_CAP = 60;

export type SyncAck = {
  ok: true;
  updatedAt: string;
  counts: {
    lifetimeEP: number;
    lifetimeRollCount: number;
    journeyEP: number;
    collectionCount: number;
    historyUpserted: number;
  };
};

export type SyncMergeResult = {
  merged: CloudSavePayload;
  updatedAt: string;
  historyUpserted: number;
};

const collectionEntrySchema = z.looseObject({
  badgeId: z.string(),
  family: z.string().nullish(),
  firstEarnedAt: z.string().nullish(),
});

/** Incremental sync — only pending rolls/collection rows + absolute counters. */
export const syncDeltaPayloadSchema = z.object({
  mode: z.literal('delta'),
  baseUpdatedAt: z.string().nullish(),
  lifetimeEP: z.number(),
  lifetimeRollCount: z.number(),
  journeyEP: z.number().optional(),
  collection: z.array(collectionEntrySchema).default([]),
  stats: z.looseObject({}).optional(),
  history: z.array(cloudRollSchema).max(UPSERT_CAP),
  settings: z.looseObject({}).optional(),
  settingsUpdatedAt: z.string().optional(),
});

export type SyncDeltaPayload = z.infer<typeof syncDeltaPayloadSchema>;

export function isSyncDeltaPayload(
  body: unknown,
): body is SyncDeltaPayload & { mode: 'delta' } {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { mode?: unknown }).mode === 'delta'
  );
}

export function toSyncAck(
  merged: CloudSavePayload,
  updatedAt: string,
  historyUpserted: number,
): SyncAck {
  return {
    ok: true,
    updatedAt,
    counts: {
      lifetimeEP: merged.lifetimeEP,
      lifetimeRollCount: merged.lifetimeRollCount,
      journeyEP: merged.journeyEP,
      collectionCount: merged.collection.length,
      historyUpserted,
    },
  };
}

export type CloudSaveLoad = {
  cloud: CloudSavePayload;
  updatedAt: string;
  settingsSyncEnabled: boolean;
};

export async function loadCloudSave(
  db: Db,
  userId: string,
): Promise<CloudSaveLoad | null> {
  const [row] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);

  if (!row) return null;

  const historyRows = await db
    .select()
    .from(rolls)
    .where(eq(rolls.userId, userId))
    .orderBy(desc(rolls.rolledAt))
    .limit(HISTORY_CAP);

  const history: RollResult[] = historyRows.map((r) => {
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
      source: rollSourceFromDb(r.source),
    };
  });

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

  const settingsSyncEnabled = Boolean(row.settingsSyncEnabled);
  const cloud: CloudSavePayload = {
    lifetimeEP: row.lifetimeEp,
    lifetimeRollCount: row.lifetimeRollCount,
    journeyEP: row.journeyEp,
    collection: Array.isArray(collection) ? collection : [],
    stats,
    history,
  };

  if (settingsSyncEnabled) {
    const blob = parseCloudSettingsJson(row.settingsJson);
    if (blob) {
      cloud.settings = blob.prefs;
      cloud.settingsUpdatedAt = blob.updatedAt;
    }
  }

  const updatedAt =
    row.updatedAt instanceof Date
      ? row.updatedAt.toISOString()
      : String(row.updatedAt);

  return {
    updatedAt,
    settingsSyncEnabled,
    cloud,
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
): Promise<SyncMergeResult> {
  const loaded = await loadCloudSave(db, userId);
  const cloud = loaded?.cloud ?? null;
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

  const settingsSyncEnabled = loaded?.settingsSyncEnabled === true;
  let settingsJsonWrite: string | undefined;
  if (settingsSyncEnabled) {
    const localBlob: CloudSettingsBlob | null =
      local.settings && local.settingsUpdatedAt
        ? {
            updatedAt: local.settingsUpdatedAt,
            prefs: pickSyncableSettings(local.settings),
          }
        : null;
    const cloudBlob: CloudSettingsBlob | null =
      cloud?.settings && cloud.settingsUpdatedAt
        ? {
            updatedAt: cloud.settingsUpdatedAt,
            prefs: pickSyncableSettings(cloud.settings),
          }
        : null;
    const winner = mergeSettingsLww(localBlob, cloudBlob);
    if (winner) {
      settingsJsonWrite = serializeCloudSettingsBlob(winner);
      merged.settings = winner.prefs;
      merged.settingsUpdatedAt = winner.updatedAt;
    }
  }

  const now = new Date();
  const updatedAt = now.toISOString();
  await db
    .insert(userProgress)
    .values({
      userId,
      lifetimeEp: merged.lifetimeEP,
      lifetimeRollCount: merged.lifetimeRollCount,
      journeyEp: merged.journeyEP,
      collectionJson: JSON.stringify(merged.collection ?? []),
      statsJson: JSON.stringify(merged.stats ?? defaultPlayStats()),
      settingsJson: settingsJsonWrite ?? '{}',
      settingsSyncEnabled: false,
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
        ...(settingsJsonWrite != null
          ? { settingsJson: settingsJsonWrite }
          : {}),
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

  return { merged, updatedAt, historyUpserted: wrote };
}

/** Read the settings sync opt-in gate (default false). */
export async function getSettingsSyncEnabled(
  db: Db,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ enabled: userProgress.settingsSyncEnabled })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);
  return Boolean(row?.enabled);
}

/**
 * Set the settings sync opt-in gate. Does not touch settings_json.
 * Ensures a user_progress row exists.
 */
export async function setSettingsSyncEnabled(
  db: Db,
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  const now = new Date();
  await db
    .insert(userProgress)
    .values({
      userId,
      lifetimeEp: 0,
      lifetimeRollCount: 0,
      journeyEp: 0,
      collectionJson: '[]',
      statsJson: '{}',
      settingsJson: '{}',
      settingsSyncEnabled: enabled,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: {
        settingsSyncEnabled: enabled,
        updatedAt: now,
      },
    });
  return enabled;
}
