import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  HISTORY_CAP,
  clearState,
  defaultState,
  loadState,
  mergeCollection,
  prependHistory,
  saveState,
} from './storage';
import type { RollResult } from '../game/types';

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

  it('round-trips state', () => {
    const state = defaultState();
    state.lifetimeEP = 100;
    state.lifetimeRollCount = 5;
    state.history = [fakeRoll('a')];
    expect(saveState(state)).toBe(true);
    const loaded = loadState();
    expect(loaded.lifetimeEP).toBe(100);
    expect(loaded.lifetimeRollCount).toBe(5);
    expect(loaded.history[0]?.id).toBe('a');
  });

  it('caps history without shrinking lifetime counters', () => {
    let history: RollResult[] = [];
    for (let i = 0; i < HISTORY_CAP + 10; i++) {
      history = prependHistory(history, fakeRoll(String(i)));
    }
    expect(history.length).toBe(HISTORY_CAP);
    // lifetime counters are independent
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

  it('recovers from corrupt JSON', () => {
    localStorage.setItem('rngdle-unlocked:v1:history', '{not json');
    const loaded = loadState();
    expect(loaded.history).toEqual([]);
  });
});
