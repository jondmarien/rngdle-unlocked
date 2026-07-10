import { describe, expect, it } from 'vite-plus/test';
import {
  applyStreaks,
  defaultPlayStats,
  finalizeStatsFromHistory,
  giantNumbersHit,
  isQualityRarity,
  recomputeBestConsecutive,
  recomputeParityStreaks,
} from './stats';
import type { RollResult } from './types';

function roll(
  partial: Partial<RollResult> & {
    totalEP: number;
    rarity: RollResult['rarity'];
  },
): RollResult {
  return {
    id: partial.id ?? `r-${partial.totalEP}`,
    number: partial.number ?? 1,
    badges: [],
    totalEP: partial.totalEP,
    rarity: partial.rarity,
    percentile: partial.percentile ?? 10,
    rolledAt: partial.rolledAt ?? new Date().toISOString(),
  };
}

describe('quality streaks', () => {
  it('detects quality rarities', () => {
    expect(isQualityRarity('uncommon')).toBe(true);
    expect(isQualityRarity('common')).toBe(false);
  });

  it('increments and breaks quality streak', () => {
    let s = defaultPlayStats();
    s = applyStreaks(s, roll({ totalEP: 300, rarity: 'uncommon' }));
    expect(s.qualityStreak).toBe(1);
    s = applyStreaks(s, roll({ totalEP: 800, rarity: 'rare' }));
    expect(s.qualityStreak).toBe(2);
    s = applyStreaks(s, roll({ totalEP: 10, rarity: 'trash' }));
    expect(s.qualityStreak).toBe(0);
    expect(s.bestQualityStreak).toBe(2);
  });

  it('tracks best roll by EP', () => {
    let s = defaultPlayStats();
    s = applyStreaks(
      s,
      roll({ id: 'a', totalEP: 100, rarity: 'common', number: 10 }),
    );
    s = applyStreaks(
      s,
      roll({ id: 'b', totalEP: 500, rarity: 'uncommon', number: 20 }),
    );
    s = applyStreaks(
      s,
      roll({ id: 'c', totalEP: 200, rarity: 'common', number: 30 }),
    );
    expect(s.bestRoll?.id).toBe('b');
    expect(s.bestRoll?.totalEP).toBe(500);
  });
});

describe('best consecutive', () => {
  it('finds best window of 3', () => {
    // newest first history
    const history = [
      roll({
        id: 'n1',
        totalEP: 10,
        rarity: 'trash',
        rolledAt: '2026-01-05T00:00:00Z',
      }),
      roll({
        id: 'n2',
        totalEP: 100,
        rarity: 'common',
        rolledAt: '2026-01-04T00:00:00Z',
      }),
      roll({
        id: 'n3',
        totalEP: 100,
        rarity: 'common',
        rolledAt: '2026-01-03T00:00:00Z',
      }),
      roll({
        id: 'n4',
        totalEP: 100,
        rarity: 'common',
        rolledAt: '2026-01-02T00:00:00Z',
      }),
      roll({
        id: 'n5',
        totalEP: 5,
        rarity: 'trash',
        rolledAt: '2026-01-01T00:00:00Z',
      }),
    ];
    const best = recomputeBestConsecutive(history, []);
    const w3 = best.find((b) => b.windowSize === 3);
    expect(w3?.totalEP).toBe(300);
  });
});

describe('parity streaks', () => {
  it('increments odd and resets on even', () => {
    let s = defaultPlayStats();
    s = applyStreaks(s, roll({ totalEP: 10, rarity: 'trash', number: 1 }));
    s = applyStreaks(s, roll({ totalEP: 10, rarity: 'trash', number: 3 }));
    s = applyStreaks(s, roll({ totalEP: 10, rarity: 'trash', number: 5 }));
    expect(s.oddStreak).toBe(3);
    expect(s.evenStreak).toBe(0);
    s = applyStreaks(s, roll({ totalEP: 10, rarity: 'trash', number: 0 }));
    expect(s.oddStreak).toBe(0);
    expect(s.evenStreak).toBe(1);
    expect(s.bestOddStreak).toBe(3);
  });

  it('recomputeParityStreaks matches history (ignores inflated stored)', () => {
    const history = [
      roll({ totalEP: 1, rarity: 'trash', number: 7 }),
      roll({ totalEP: 1, rarity: 'trash', number: 5 }),
      roll({ totalEP: 1, rarity: 'trash', number: 3 }),
      roll({ totalEP: 1, rarity: 'trash', number: 1 }),
    ];
    const parity = recomputeParityStreaks(history);
    expect(parity.oddStreak).toBe(4);
    expect(parity.evenStreak).toBe(0);
    expect(parity.bestOddStreak).toBe(4);

    const finalized = finalizeStatsFromHistory(
      { ...defaultPlayStats(), oddStreak: 0, bestOddStreak: 99 },
      history,
    );
    expect(finalized.oddStreak).toBe(4);
    expect(finalized.bestOddStreak).toBe(99);
  });

  it('merge-then-finalize rejects inflated current oddStreak', () => {
    // Mirrors server mergeStats: currents → 0, bests → max; client finalizes.
    const history = [
      roll({ totalEP: 1, rarity: 'trash', number: 9 }),
      roll({ totalEP: 1, rarity: 'trash', number: 7 }),
      roll({ totalEP: 1, rarity: 'trash', number: 5 }),
    ];
    const merged = {
      ...defaultPlayStats(),
      oddStreak: 0,
      evenStreak: 0,
      bestOddStreak: 99,
      bestEvenStreak: 0,
    };
    const next = finalizeStatsFromHistory(merged, history);
    expect(next.oddStreak).toBe(3);
    expect(next.oddStreak).not.toBe(99);
    expect(next.bestOddStreak).toBe(99);
  });
});

describe('giantNumbersHit', () => {
  it('requires five rolls summing over 4e6 by number value', () => {
    expect(giantNumbersHit([])).toBe(false);
    const small = Array.from({ length: 5 }, (_, i) =>
      roll({ totalEP: 1, rarity: 'trash', number: 100_000 + i }),
    );
    expect(giantNumbersHit(small)).toBe(false);
    const big = Array.from({ length: 5 }, (_, i) =>
      roll({ totalEP: 1, rarity: 'trash', number: 900_000 + i }),
    );
    expect(giantNumbersHit(big)).toBe(true);
  });
});
