import { describe, expect, it } from 'vite-plus/test';
import { evaluateBadges, NUMBER_BADGES } from './badges';

function ids(n: number): string[] {
  return evaluateBadges(n).map((b) => b.id);
}

describe('badge catalog', () => {
  it('has a large catalog for variety', () => {
    expect(NUMBER_BADGES.length).toBeGreaterThanOrEqual(120);
  });

  it('has unique ids', () => {
    const set = new Set(NUMBER_BADGES.map((b) => b.id));
    expect(set.size).toBe(NUMBER_BADGES.length);
  });
});

describe('badge fixtures', () => {
  it('prime 97', () => {
    expect(ids(97)).toContain('prime');
  });
  it('palindrome 12321', () => {
    expect(ids(12321)).toContain('palindrome');
  });
  it('power of two 65536', () => {
    expect(ids(65536)).toContain('power-of-two');
  });
  it('round thousand 1000', () => {
    expect(ids(1000)).toContain('round-thousand');
  });
  it('all same 111111', () => {
    expect(ids(111111)).toContain('all-same-digits');
  });
  it('ascending 123456', () => {
    expect(ids(123456)).toContain('ascending');
  });
  it('nice 42', () => {
    expect(ids(42)).toContain('nice-42');
  });
  it('leet 1337', () => {
    expect(ids(1337)).toContain('leet-1337');
  });
  it('error 404', () => {
    expect(ids(404)).toContain('error-404');
  });
  it('low ball 7', () => {
    expect(ids(7)).toContain('low-ball');
    expect(ids(7)).toContain('one-digit');
  });
  it('high roller 999999', () => {
    expect(ids(999999)).toContain('high-roller');
  });
  it('zero', () => {
    expect(ids(0)).toContain('zero');
  });
  it('million Absolute Ceiling seal', () => {
    expect(ids(1_000_000)).toContain('million');
    const hit = evaluateBadges(1_000_000).find((h) => h.id === 'million');
    expect(hit?.name).toBe('Absolute Ceiling');
    expect(hit?.image).toBe('/badges/ceiling.jpg');
    expect(hit?.ep).toBe(100_000);
    expect(hit?.rarity).toBe('mythic');
  });
  it('even 8', () => {
    expect(ids(8)).toContain('even');
  });
  it('harshad 18', () => {
    expect(ids(18)).toContain('harshad');
  });
  it('full house 11222', () => {
    expect(ids(11222)).toContain('full-house');
  });
  it('six-seven contains 67', () => {
    expect(ids(356773)).toContain('six-seven');
  });
  it('sequence-3 consecutive digits', () => {
    expect(ids(356773)).toContain('sequence-3');
  });
  it('includes emoji and highlights on hits', () => {
    const hits = evaluateBadges(42);
    const nice = hits.find((h) => h.id === 'nice-42');
    expect(nice?.emoji).toBeTruthy();
    expect(nice?.highlights.length).toBe(2);
    expect(nice?.rarity).toBeTruthy();
  });
});
