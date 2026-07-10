import { describe, expect, it } from 'vite-plus/test';
import { evaluateBadges } from './badges/index';
import { rarityFromEP } from './rarity';
import { ROLL_MAX, ROLL_RANGE } from './rng';

describe('single-digit rolls', () => {
  it('uniform range includes 0..9 (~9/1_000_001 for any of 1–9)', () => {
    expect(ROLL_MAX).toBe(1_000_000);
    expect(ROLL_RANGE).toBe(1_000_001);
    expect(9 / ROLL_RANGE).toBeCloseTo(9 / 1_000_001, 10);
  });

  it('scores 2 as a mythic stack with the Single Digit badge', () => {
    const hits = evaluateBadges(2);
    const ep = hits.reduce((s, h) => s + h.ep, 0);
    expect(hits.some((h) => h.id === 'one-digit')).toBe(true);
    expect(ep).toBeGreaterThanOrEqual(11_000);
    expect(rarityFromEP(ep)).toBe('mythic');
  });

  it('one-digit badge matches 1–9 only (not 0)', () => {
    expect(evaluateBadges(2).some((h) => h.id === 'one-digit')).toBe(true);
    expect(evaluateBadges(0).some((h) => h.id === 'one-digit')).toBe(false);
  });
});
