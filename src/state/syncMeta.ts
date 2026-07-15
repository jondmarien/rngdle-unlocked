import type { CollectionEntry, PlayStats, RollResult } from '../game/types';
import { STORAGE_KEYS } from '../lib/storage-keys';

/** Must match server/sync.ts UPSERT_CAP — max rolls per delta POST. */
export const CLIENT_UPSERT_CAP = 60;

export type SyncMeta = {
  cursorUpdatedAt: string | null;
  ackedRollIds: string[];
  ackedBadgeIds: string[];
};

const EMPTY_META: SyncMeta = {
  cursorUpdatedAt: null,
  ackedRollIds: [],
  ackedBadgeIds: [],
};

function safeParse(raw: string | null): SyncMeta {
  if (!raw) return { ...EMPTY_META };
  try {
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      cursorUpdatedAt:
        typeof parsed.cursorUpdatedAt === 'string'
          ? parsed.cursorUpdatedAt
          : null,
      ackedRollIds: Array.isArray(parsed.ackedRollIds)
        ? parsed.ackedRollIds.filter(
            (id): id is string => typeof id === 'string',
          )
        : [],
      ackedBadgeIds: Array.isArray(parsed.ackedBadgeIds)
        ? parsed.ackedBadgeIds.filter(
            (id): id is string => typeof id === 'string',
          )
        : [],
    };
  } catch {
    return { ...EMPTY_META };
  }
}

export function loadSyncMeta(): SyncMeta {
  if (typeof localStorage === 'undefined') return { ...EMPTY_META };
  return safeParse(localStorage.getItem(STORAGE_KEYS.syncMeta));
}

export function saveSyncMeta(meta: SyncMeta): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.syncMeta, JSON.stringify(meta));
}

export function clearSyncMeta(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.syncMeta);
}

export type DeltaBuildInput = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
  settings?: Partial<import('../game/types').AppSettings>;
  settingsUpdatedAt?: string;
};

export type SyncDeltaPayload = {
  mode: 'delta';
  baseUpdatedAt: string | null;
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
  settings?: Partial<import('../game/types').AppSettings>;
  settingsUpdatedAt?: string;
};

/** Build a compact delta from local state + ack cursor. */
export function buildDeltaPayload(
  state: DeltaBuildInput,
  meta: SyncMeta,
): SyncDeltaPayload {
  const ackedRolls = new Set(meta.ackedRollIds);
  const ackedBadges = new Set(meta.ackedBadgeIds);

  const unacked = state.history.filter((r) => r?.id && !ackedRolls.has(r.id));
  const history = unacked
    .sort((a, b) => (a.rolledAt < b.rolledAt ? 1 : -1))
    .slice(0, CLIENT_UPSERT_CAP);

  const collection = state.collection.filter(
    (c) => c?.badgeId && !ackedBadges.has(c.badgeId),
  );

  return {
    mode: 'delta',
    baseUpdatedAt: meta.cursorUpdatedAt,
    lifetimeEP: state.lifetimeEP,
    lifetimeRollCount: state.lifetimeRollCount,
    journeyEP: state.journeyEP,
    collection,
    stats: state.stats,
    history,
    ...(state.settings && state.settingsUpdatedAt
      ? {
          settings: state.settings,
          settingsUpdatedAt: state.settingsUpdatedAt,
        }
      : {}),
  };
}

export function applyAckToMeta(
  meta: SyncMeta,
  ackUpdatedAt: string,
  sent: { history: RollResult[]; collection: CollectionEntry[] },
  localHistoryIds: Set<string>,
): SyncMeta {
  const nextRolls = new Set(meta.ackedRollIds);
  for (const r of sent.history) {
    if (r?.id) nextRolls.add(r.id);
  }
  for (const id of Array.from(nextRolls)) {
    if (!localHistoryIds.has(id)) nextRolls.delete(id);
  }

  const nextBadges = new Set(meta.ackedBadgeIds);
  for (const c of sent.collection) {
    if (c?.badgeId) nextBadges.add(c.badgeId);
  }

  return {
    cursorUpdatedAt: ackUpdatedAt,
    ackedRollIds: [...nextRolls],
    ackedBadgeIds: [...nextBadges],
  };
}
