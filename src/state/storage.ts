import type {
  AppSettings,
  CollectionEntry,
  RollResult,
} from '../game/types';

export const HISTORY_CAP = 500;

const KEYS = {
  history: 'rngdle-unlocked:v1:history',
  lifetimeEP: 'rngdle-unlocked:v1:lifetimeEP',
  lifetimeRollCount: 'rngdle-unlocked:v1:lifetimeRollCount',
  journeyEP: 'rngdle-unlocked:v1:journeyEP',
  collection: 'rngdle-unlocked:v1:collection',
  settings: 'rngdle-unlocked:v1:settings',
} as const;

export type PersistedState = {
  history: RollResult[];
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  settings: AppSettings;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  shareShowRollCount: false,
};

export function defaultState(): PersistedState {
  return {
    history: [],
    lifetimeEP: 0,
    lifetimeRollCount: 0,
    journeyEP: 0,
    collection: [],
    settings: { ...DEFAULT_SETTINGS },
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
  return {
    history: Array.isArray(history) ? history.slice(0, HISTORY_CAP) : [],
    lifetimeEP: Number.isFinite(lifetimeEP) ? lifetimeEP : 0,
    lifetimeRollCount: Number.isFinite(lifetimeRollCount) ? lifetimeRollCount : 0,
    journeyEP: Number.isFinite(journeyEP) ? journeyEP : 0,
    collection: Array.isArray(collection) ? collection : [],
    settings,
  };
}

/** Prepend roll; cap history; does not touch lifetime counters. */
export function prependHistory(history: RollResult[], roll: RollResult): RollResult[] {
  return [roll, ...history].slice(0, HISTORY_CAP);
}

export function saveState(state: PersistedState): boolean {
  if (typeof localStorage === 'undefined') return false;
  const ok =
    writeJSON(KEYS.history, state.history.slice(0, HISTORY_CAP)) &&
    writeJSON(KEYS.lifetimeEP, state.lifetimeEP) &&
    writeJSON(KEYS.lifetimeRollCount, state.lifetimeRollCount) &&
    writeJSON(KEYS.journeyEP, state.journeyEP) &&
    writeJSON(KEYS.collection, state.collection) &&
    writeJSON(KEYS.settings, state.settings);
  return ok;
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
