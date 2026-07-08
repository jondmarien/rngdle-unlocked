import { describe, expect, it } from 'vite-plus/test';
import { evaluateNumber } from './evaluate';
import { ROLL_MAX } from './rng';

describe('evaluateNumber', () => {
  it('scores a known number', () => {
    const r = evaluateNumber(42);
    expect(r.number).toBe(42);
    expect(r.badges.some((b) => b.id === 'nice-42')).toBe(true);
    expect(r.totalEP).toBeGreaterThan(0);
    expect(r.rarity).toBeTruthy();
    expect(r.id).toBeTruthy();
    expect(r.rolledAt).toMatch(/^\d{4}-/);
  });

  it('rejects out of range', () => {
    expect(() => evaluateNumber(-1)).toThrow();
    expect(() => evaluateNumber(ROLL_MAX + 1)).toThrow();
    expect(() => evaluateNumber(1.5)).toThrow();
  });
});
