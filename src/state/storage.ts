import type {
  AppSettings,
  CollectionEntry,
  PlayStats,
  RollResult,
} from '../game/types';
import { defaultPlayStats } from '../game/stats';

export const HISTORY_CAP = 500;
export const SAVE_VERSION = 2;

const KEYS = {
  history: 'rngdle-unlocked:v1:history',
  lifetimeEP: 'rngdle-unlocked:v1:lifetimeEP',
  lifetimeRollCount: 'rngdle-unlocked:v1:lifetimeRollCount',
  journeyEP: 'rngdle-unlocked:v1:journeyEP',
  collection: 'rngdle-unlocked:v1:collection',
  settings: 'rngdle-unlocked:v1:settings',
  stats: 'rngdle-unlocked:v1:stats',
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
  const history = readJSON<RollResult[]>(KEYS.history, []);
  const lifetimeEP = readJSON<number>(KEYS.lifetimeEP, 0);
  const lifetimeRollCount = readJSON<number>(KEYS.lifetimeRollCount, 0);
  const journeyEP = readJSON<number>(KEYS.journeyEP, 0);
  const collection = readJSON<CollectionEntry[]>(KEYS.collection, []);
  const settings = {
    ...DEFAULT_SETTINGS,
    ...readJSON<Partial<AppSettings>>(KEYS.settings, {}),
  };
  const stats = {
    ...defaultPlayStats(),
    ...readJSON<Partial<PlayStats>>(KEYS.stats, {}),
  };
  return {
    history: Array.isArray(history) ? history.slice(0, HISTORY_CAP) : [],
    lifetimeEP: Number.isFinite(lifetimeEP) ? lifetimeEP : 0,
    lifetimeRollCount: Number.isFinite(lifetimeRollCount) ? lifetimeRollCount : 0,
    journeyEP: Number.isFinite(journeyEP) ? journeyEP : 0,
    collection: Array.isArray(collection) ? collection : [],
    settings,
    stats,
  };
}

export function prependHistory(history: RollResult[], roll: RollResult): RollResult[] {
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

  const history = Array.isArray(stateRaw.history)
    ? (stateRaw.history as RollResult[]).slice(0, HISTORY_CAP)
    : [];
  const collection = Array.isArray(stateRaw.collection)
    ? (stateRaw.collection as CollectionEntry[])
    : [];
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
