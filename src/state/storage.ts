import { z } from 'zod';
import type {
  AppSettings,
  CollectionEntry,
  PlayStats,
  RollResult,
} from '../game/types';
import { defaultPlayStats, finalizeStatsFromHistory } from '../game/stats';
import { collectionEntrySchema, rollResultSchema } from '../lib/schemas';
import { STORAGE_KEYS } from '../lib/storage-keys';

export const HISTORY_CAP = 500;
export const SAVE_VERSION = 2;

const KEYS = {
  history: STORAGE_KEYS.history,
  lifetimeEP: STORAGE_KEYS.lifetimeEP,
  lifetimeRollCount: STORAGE_KEYS.lifetimeRollCount,
  journeyEP: STORAGE_KEYS.journeyEP,
  collection: STORAGE_KEYS.collection,
  settings: STORAGE_KEYS.settings,
  stats: STORAGE_KEYS.stats,
} as const;

export type PersistedState = {
  history: RollResult[];
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  settings: AppSettings;
  stats: PlayStats;
};

export type ExportPayload = {
  version: number;
  app: 'rngdle-unlocked';
  exportedAt: string;
  state: PersistedState;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  shareShowRollCount: false,
  soundEnabled: false,
  confettiEnabled: true,
  /** Default on; cracked-screen + heavy shake on trash settles. */
  trashCrackEnabled: true,
  /** Default on; users can turn off under Settings (localStorage). */
  autoScrollBadges: true,
  /** Default off — anomaly/mythic/divine share is manual unless enabled. */
  autoShareHighRarity: false,
  /** Default on; hide Latest runs rail / mobile list under Settings. */
  showLatestRuns: true,
  /** Default on; include collection seals on Discord share. */
  shareShowUnlockedBadges: true,
};

export function defaultState(): PersistedState {
  return {
    history: [],
    lifetimeEP: 0,
    lifetimeRollCount: 0,
    journeyEP: 0,
    collection: [],
    settings: { ...DEFAULT_SETTINGS },
    stats: defaultPlayStats(),
  };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadState(): PersistedState {
  if (typeof localStorage === 'undefined') {
    return defaultState();
  }
  const historyRaw = readJSON<RollResult[]>(KEYS.history, []);
  const history = Array.isArray(historyRaw)
    ? historyRaw.slice(0, HISTORY_CAP)
    : [];
  const lifetimeEP = readJSON<number>(KEYS.lifetimeEP, 0);
  const lifetimeRollCount = readJSON<number>(KEYS.lifetimeRollCount, 0);
  const journeyEP = readJSON<number>(KEYS.journeyEP, 0);
  const collectionRaw = readJSON<CollectionEntry[]>(KEYS.collection, []);
  const collectionIn = Array.isArray(collectionRaw) ? collectionRaw : [];
  const collection = backfillCollectionTimestamps(collectionIn, history);
  const settings = {
    ...DEFAULT_SETTINGS,
    ...readJSON<Partial<AppSettings>>(KEYS.settings, {}),
  };
  const stats = finalizeStatsFromHistory(
    {
      ...defaultPlayStats(),
      ...readJSON<Partial<PlayStats>>(KEYS.stats, {}),
    },
    history,
  );
  const state: PersistedState = {
    history,
    lifetimeEP: Number.isFinite(lifetimeEP) ? lifetimeEP : 0,
    lifetimeRollCount: Number.isFinite(lifetimeRollCount)
      ? lifetimeRollCount
      : 0,
    journeyEP: Number.isFinite(journeyEP) ? journeyEP : 0,
    collection,
    settings,
    stats,
  };
  // Persist retroactive timestamps so Codex keeps them offline
  if (collectionNeedsPersist(collectionIn, collection)) {
    saveState(state);
  }
  return state;
}

function isValidIso(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

/**
 * Ensure every collection entry has firstEarnedAt.
 * Retroactive: prefer earliest history roll that earned the badge when known.
 */
export function backfillCollectionTimestamps(
  collection: CollectionEntry[],
  history: RollResult[],
): CollectionEntry[] {
  if (!collection.length) return collection;

  const firstFromHistory = new Map<string, string>();
  const chrono = [...history].sort((a, b) =>
    a.rolledAt < b.rolledAt ? -1 : a.rolledAt > b.rolledAt ? 1 : 0,
  );
  for (const roll of chrono) {
    const at = roll.rolledAt;
    if (!isValidIso(at)) continue;
    for (const b of roll.badges ?? []) {
      if (!b?.id) continue;
      if (!firstFromHistory.has(b.id)) {
        firstFromHistory.set(b.id, at);
      }
    }
  }

  const oldestRoll = chrono.find((r) => isValidIso(r.rolledAt))?.rolledAt;
  const fallback = oldestRoll ?? new Date().toISOString();

  let changed = false;
  const next = collection.map((e) => {
    const stored = isValidIso(e.firstEarnedAt) ? e.firstEarnedAt : '';
    const fromHist = firstFromHistory.get(e.badgeId);

    let firstEarnedAt = stored;
    if (!firstEarnedAt && fromHist) {
      firstEarnedAt = fromHist;
    } else if (!firstEarnedAt) {
      firstEarnedAt = fallback;
    } else if (fromHist && fromHist < firstEarnedAt) {
      // History proves an earlier unlock than a late/sync timestamp
      firstEarnedAt = fromHist;
    }

    if (firstEarnedAt !== e.firstEarnedAt || e.family == null) {
      changed = true;
      return {
        badgeId: e.badgeId,
        family: e.family,
        firstEarnedAt,
      };
    }
    return e;
  });

  return changed ? next : collection;
}

function collectionNeedsPersist(
  before: CollectionEntry[],
  after: CollectionEntry[],
): boolean {
  if (before.length !== after.length) return true;
  const map = new Map(before.map((e) => [e.badgeId, e.firstEarnedAt]));
  for (const e of after) {
    if (map.get(e.badgeId) !== e.firstEarnedAt) return true;
  }
  return false;
}

export function prependHistory(
  history: RollResult[],
  roll: RollResult,
): RollResult[] {
  return [roll, ...history].slice(0, HISTORY_CAP);
}

export function saveState(state: PersistedState): boolean {
  if (typeof localStorage === 'undefined') return false;
  return (
    writeJSON(KEYS.history, state.history.slice(0, HISTORY_CAP)) &&
    writeJSON(KEYS.lifetimeEP, state.lifetimeEP) &&
    writeJSON(KEYS.lifetimeRollCount, state.lifetimeRollCount) &&
    writeJSON(KEYS.journeyEP, state.journeyEP) &&
    writeJSON(KEYS.collection, state.collection) &&
    writeJSON(KEYS.settings, state.settings) &&
    writeJSON(KEYS.stats, state.stats)
  );
}

export function clearState(): void {
  if (typeof localStorage === 'undefined') return;
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(STORAGE_KEYS.syncMeta);
}

export function mergeCollection(
  existing: CollectionEntry[],
  badgeIds: { id: string; family: CollectionEntry['family'] }[],
  at: string,
): CollectionEntry[] {
  const map = new Map(existing.map((e) => [e.badgeId, e]));
  for (const b of badgeIds) {
    if (!map.has(b.id)) {
      map.set(b.id, { badgeId: b.id, firstEarnedAt: at, family: b.family });
    }
  }
  return [...map.values()];
}

export function buildExportPayload(state: PersistedState): ExportPayload {
  return {
    version: SAVE_VERSION,
    app: 'rngdle-unlocked',
    exportedAt: new Date().toISOString(),
    state,
  };
}

export function parseImportPayload(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid save file');
  }
  const obj = raw as Record<string, unknown>;
  // Accept wrapped export or raw state
  const stateRaw =
    obj.state && typeof obj.state === 'object'
      ? (obj.state as Record<string, unknown>)
      : obj;

  if (obj.app && obj.app !== 'rngdle-unlocked') {
    throw new Error('Save file is not for RNGdle Unlocked');
  }

  // Validate every element — a hand-edited / corrupt save must not flow
  // into streak recompute, secret merge, or rarity display unchecked.
  const historyParsed = z
    .array(rollResultSchema)
    .safeParse(
      Array.isArray(stateRaw.history)
        ? stateRaw.history.slice(0, HISTORY_CAP)
        : [],
    );
  if (!historyParsed.success) {
    throw new Error('Invalid save file: corrupt roll history');
  }
  const history = historyParsed.data as RollResult[];

  const collectionParsed = z
    .array(collectionEntrySchema)
    .safeParse(Array.isArray(stateRaw.collection) ? stateRaw.collection : []);
  if (!collectionParsed.success) {
    throw new Error('Invalid save file: corrupt badge collection');
  }
  const collection = collectionParsed.data as CollectionEntry[];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(typeof stateRaw.settings === 'object' && stateRaw.settings
      ? (stateRaw.settings as Partial<AppSettings>)
      : {}),
  };
  const stats = {
    ...defaultPlayStats(),
    ...(typeof stateRaw.stats === 'object' && stateRaw.stats
      ? (stateRaw.stats as Partial<PlayStats>)
      : {}),
  };

  return {
    history,
    lifetimeEP: Number(stateRaw.lifetimeEP) || 0,
    lifetimeRollCount: Number(stateRaw.lifetimeRollCount) || 0,
    journeyEP: Number(stateRaw.journeyEP) || 0,
    collection,
    settings,
    stats,
  };
}
