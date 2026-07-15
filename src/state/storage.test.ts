import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  HISTORY_CAP,
  buildExportPayload,
  clearState,
  defaultState,
  loadState,
  mergeCollection,
  migrateShareShowRollCountPresence,
  parseImportPayload,
  prependHistory,
  saveState,
  DEFAULT_SETTINGS,
} from './storage';
import type { RollResult } from '../game/types';
import { STORAGE_KEYS } from '../lib/storage-keys';

function installMemoryLocalStorage(): void {
  const map = new Map<string, string>();
  const ls = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: ls,
    configurable: true,
  });
}

function fakeRoll(id: string): RollResult {
  return {
    id,
    number: 1,
    badges: [],
    totalEP: 0,
    rarity: 'trash',
    percentile: 0,
    rolledAt: new Date().toISOString(),
  };
}

describe('storage', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearState();
  });

  it('round-trips state including stats', () => {
    const state = defaultState();
    state.lifetimeEP = 100;
    state.lifetimeRollCount = 5;
    state.history = [fakeRoll('a')];
    state.stats.dayStreak = 3;
    expect(saveState(state)).toBe(true);
    const loaded = loadState();
    expect(loaded.lifetimeEP).toBe(100);
    expect(loaded.lifetimeRollCount).toBe(5);
    expect(loaded.history[0]?.id).toBe('a');
    expect(loaded.stats.dayStreak).toBe(3);
  });

  it('caps history without shrinking lifetime counters', () => {
    let history: RollResult[] = [];
    for (let i = 0; i < HISTORY_CAP + 10; i++) {
      history = prependHistory(history, fakeRoll(String(i)));
    }
    expect(history.length).toBe(HISTORY_CAP);
    const state = defaultState();
    state.history = history;
    state.lifetimeRollCount = HISTORY_CAP + 10;
    state.lifetimeEP = 999;
    saveState(state);
    const loaded = loadState();
    expect(loaded.history.length).toBe(HISTORY_CAP);
    expect(loaded.lifetimeRollCount).toBe(HISTORY_CAP + 10);
    expect(loaded.lifetimeEP).toBe(999);
  });

  it('mergeCollection is idempotent', () => {
    const a = mergeCollection([], [{ id: 'prime', family: 'math' }], 't1');
    const b = mergeCollection(a, [{ id: 'prime', family: 'math' }], 't2');
    expect(b).toHaveLength(1);
    expect(b[0]?.firstEarnedAt).toBe('t1');
  });

  it('backfillCollectionTimestamps uses earliest history roll', async () => {
    const { backfillCollectionTimestamps } = await import('./storage');
    const collection = [
      {
        badgeId: 'prime',
        family: 'math' as const,
        firstEarnedAt: '2026-07-08T12:00:00.000Z',
      },
      {
        badgeId: 'even',
        family: 'math' as const,
        firstEarnedAt: '',
      },
    ];
    const history = [
      {
        id: 'r2',
        number: 4,
        totalEP: 1,
        rarity: 'common' as const,
        percentile: 50,
        rolledAt: '2026-07-02T00:00:00.000Z',
        badges: [
          {
            id: 'even',
            name: 'Even',
            description: '',
            ep: 1,
            family: 'math' as const,
            emoji: '',
            highlights: [],
            rarity: 'common' as const,
          },
        ],
      },
      {
        id: 'r1',
        number: 2,
        totalEP: 1,
        rarity: 'common' as const,
        percentile: 50,
        rolledAt: '2026-07-01T00:00:00.000Z',
        badges: [
          {
            id: 'prime',
            name: 'Prime',
            description: '',
            ep: 1,
            family: 'math' as const,
            emoji: '',
            highlights: [],
            rarity: 'common' as const,
          },
          {
            id: 'even',
            name: 'Even',
            description: '',
            ep: 1,
            family: 'math' as const,
            emoji: '',
            highlights: [],
            rarity: 'common' as const,
          },
        ],
      },
    ];
    const next = backfillCollectionTimestamps(collection, history);
    expect(next.find((c) => c.badgeId === 'prime')?.firstEarnedAt).toBe(
      '2026-07-01T00:00:00.000Z',
    );
    expect(next.find((c) => c.badgeId === 'even')?.firstEarnedAt).toBe(
      '2026-07-01T00:00:00.000Z',
    );
  });

  it('recovers from corrupt JSON', () => {
    localStorage.setItem('rngdle-unlocked:v1:history', '{not json');
    const loaded = loadState();
    expect(loaded.history).toEqual([]);
  });

  it('export/import payload round-trip', () => {
    const state = defaultState();
    state.lifetimeRollCount = 42;
    state.settings.soundEnabled = true;
    const payload = buildExportPayload(state);
    expect(payload.app).toBe('rngdle-unlocked');
    const restored = parseImportPayload(payload);
    expect(restored.lifetimeRollCount).toBe(42);
    expect(restored.settings.soundEnabled).toBe(true);
  });

  it('defaults shareShowRollCount to true for new installs', () => {
    expect(DEFAULT_SETTINGS.shareShowRollCount).toBe(true);
    expect(loadState().settings.shareShowRollCount).toBe(true);
  });

  it('presence-migrates shareShowRollCount when key absent from raw JSON', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ theme: 'dark', soundEnabled: true }),
    );
    const loaded = loadState();
    expect(loaded.settings.shareShowRollCount).toBe(true);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!);
    expect(raw.shareShowRollCount).toBe(true);
    const mig = JSON.parse(localStorage.getItem(STORAGE_KEYS.migrations)!);
    expect(mig.shareShowRollCountPresence).toBe(true);
  });

  it('preserves explicit shareShowRollCount false opt-out', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ theme: 'dark', shareShowRollCount: false }),
    );
    const loaded = loadState();
    expect(loaded.settings.shareShowRollCount).toBe(false);
    expect(migrateShareShowRollCountPresence(null)).toBe(null);
  });

  it('presence-migrates hapticsEnabled off when key absent from existing JSON', () => {
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ theme: 'dark', soundEnabled: true }),
    );
    const loaded = loadState();
    expect(loaded.settings.hapticsEnabled).toBe(false);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!);
    expect(raw.hapticsEnabled).toBe(false);
    const mig = JSON.parse(localStorage.getItem(STORAGE_KEYS.migrations)!);
    expect(mig.hapticsEnabledPresence).toBe(true);
  });

  it('keeps hapticsEnabled default on for brand-new installs', () => {
    const loaded = loadState();
    expect(loaded.settings.hapticsEnabled).toBe(true);
  });
});
