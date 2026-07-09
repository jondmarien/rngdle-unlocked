import { describe, expect, it } from 'vite-plus/test';
import {
  applyStreaks,
  defaultPlayStats,
  isQualityRarity,
  recomputeBestConsecutive,
} from './stats';
import type { RollResult } from './types';

function roll(partial: Partial<RollResult> & { totalEP: number; rarity: RollResult['rarity'] }): RollResult {
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
    s = applyStreaks(s, roll({ id: 'a', totalEP: 100, rarity: 'common', number: 10 }));
    s = applyStreaks(s, roll({ id: 'b', totalEP: 500, rarity: 'uncommon', number: 20 }));
    s = applyStreaks(s, roll({ id: 'c', totalEP: 200, rarity: 'common', number: 30 }));
    expect(s.bestRoll?.id).toBe('b');
    expect(s.bestRoll?.totalEP).toBe(500);
  });
});

describe('best consecutive', () => {
  it('finds best window of 3', () => {
    // newest first history
    const history = [
      roll({ id: 'n1', totalEP: 10, rarity: 'trash', rolledAt: '2026-01-05T00:00:00Z' }),
      roll({ id: 'n2', totalEP: 100, rarity: 'common', rolledAt: '2026-01-04T00:00:00Z' }),
      roll({ id: 'n3', totalEP: 100, rarity: 'common', rolledAt: '2026-01-03T00:00:00Z' }),
      roll({ id: 'n4', totalEP: 100, rarity: 'common', rolledAt: '2026-01-02T00:00:00Z' }),
      roll({ id: 'n5', totalEP: 5, rarity: 'trash', rolledAt: '2026-01-01T00:00:00Z' }),
    ];
    const best = recomputeBestConsecutive(history, []);
    const w3 = best.find((b) => b.windowSize === 3);
    expect(w3?.totalEP).toBe(300);
  });
});
