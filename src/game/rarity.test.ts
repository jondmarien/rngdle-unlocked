import { describe, expect, it } from 'vite-plus/test';
import { rarityFromEP } from './rarity';
import { percentileFromEP } from './percentile';
import { sumEP } from './score';

describe('rarityFromEP', () => {
  it('maps boundaries (dense-catalog ladder)', () => {
    expect(rarityFromEP(0)).toBe('trash');
    expect(rarityFromEP(1_649)).toBe('trash');
    expect(rarityFromEP(1_650)).toBe('common');
    expect(rarityFromEP(2_199)).toBe('common');
    expect(rarityFromEP(2_200)).toBe('uncommon');
    expect(rarityFromEP(3_499)).toBe('uncommon');
    expect(rarityFromEP(3_500)).toBe('rare');
    expect(rarityFromEP(6_499)).toBe('rare');
    expect(rarityFromEP(6_500)).toBe('epic');
    expect(rarityFromEP(7_999)).toBe('epic');
    expect(rarityFromEP(8_000)).toBe('anomaly');
    expect(rarityFromEP(10_999)).toBe('anomaly');
    expect(rarityFromEP(11_000)).toBe('mythic');
  });
});

describe('percentileFromEP', () => {
  it('is monotonic non-decreasing', () => {
    let prev = -1;
    for (const ep of [0, 1, 10, 50, 100, 500, 2000, 10000, 100000]) {
      const p = percentileFromEP(ep);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
      prev = p;
    }
  });

  it('anchors high tiers near the rarity ladder (not ~top 20%)', () => {
    // epic floor → ~top 12%
    expect(100 - percentileFromEP(6_500)).toBeCloseTo(12, 0);
    // anomaly floor → top 5%
    expect(100 - percentileFromEP(8_000)).toBeCloseTo(5, 0);
    // mythic floor → top 1%
    expect(100 - percentileFromEP(11_000)).toBeCloseTo(1, 0);
    // deep mythic still rarer than floor
    expect(percentileFromEP(20_000)).toBeGreaterThan(percentileFromEP(11_000));
  });
});

describe('sumEP', () => {
  it('sums badge EP', () => {
    expect(sumEP([{ ep: 10 }, { ep: 20 }])).toBe(30);
    expect(sumEP([])).toBe(0);
  });
});
