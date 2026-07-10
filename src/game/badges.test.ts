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
    expect(hit?.rarity).toBe('divine');
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
  it('two-trips 233223 fires and excludes trips/full-house', () => {
    const handIds = ids(233223);
    expect(handIds).toContain('two-trips');
    expect(handIds).not.toContain('trips');
    expect(handIds).not.toContain('full-house');
  });
  it('two-trips 222333 and 333222 — no double-fire with trips', () => {
    for (const n of [222333, 333222]) {
      const handIds = ids(n);
      expect(handIds).toContain('two-trips');
      expect(handIds).not.toContain('trips');
      expect(handIds).not.toContain('full-house');
    }
  });
  it('full-house 112223 excludes two-trips and trips', () => {
    const handIds = ids(112223);
    expect(handIds).toContain('full-house');
    expect(handIds).not.toContain('two-trips');
    expect(handIds).not.toContain('trips');
  });
  it('pure trips excludes two-trips', () => {
    // three 1s, rest unique → trips only (not 3+3, not 3+2)
    const handIds = ids(111234);
    expect(handIds).toContain('trips');
    expect(handIds).not.toContain('two-trips');
    expect(handIds).not.toContain('full-house');
  });
  it('three-pair 112233 fires and excludes two-pair', () => {
    const handIds = ids(112233);
    expect(handIds).toContain('three-pair');
    expect(handIds).not.toContain('two-pair');
    expect(handIds).not.toContain('pair');
  });
  it('two-pair 112234 excludes three-pair', () => {
    const handIds = ids(112234);
    expect(handIds).toContain('two-pair');
    expect(handIds).not.toContain('three-pair');
  });
  it('full-quads 111122 fires and excludes quads/pair', () => {
    const handIds = ids(111122);
    expect(handIds).toContain('full-quads');
    expect(handIds).not.toContain('quads');
    expect(handIds).not.toContain('pair');
  });
  it('quads 111123 excludes full-quads', () => {
    const handIds = ids(111123);
    expect(handIds).toContain('quads');
    expect(handIds).not.toContain('full-quads');
  });
  it('harshad and div7 expose equation proofs', () => {
    const harshad = evaluateBadges(18).find((h) => h.id === 'harshad');
    expect(harshad?.equation).toEqual({
      kind: 'product',
      divisor: 9,
      quotient: 2,
    });
    const lucky = evaluateBadges(709590).find((h) => h.id === 'div7');
    expect(lucky?.equation).toEqual({
      kind: 'product',
      divisor: 7,
      quotient: 101370,
    });
  });
  it('square cube pronic and digit-sum expose equation proofs', () => {
    expect(evaluateBadges(36).find((h) => h.id === 'square')?.equation).toEqual(
      { kind: 'power', base: 6, exponent: 2 },
    );
    expect(evaluateBadges(27).find((h) => h.id === 'cube')?.equation).toEqual({
      kind: 'power',
      base: 3,
      exponent: 3,
    });
    expect(
      evaluateBadges(65536).find((h) => h.id === 'power-of-two')?.equation,
    ).toEqual({ kind: 'power', base: 2, exponent: 16 });
    expect(evaluateBadges(12).find((h) => h.id === 'pronic')?.equation).toEqual(
      { kind: 'pronic', k: 3 },
    );
    expect(
      evaluateBadges(19).find((h) => h.id === 'digit-sum-10')?.equation,
    ).toEqual({
      kind: 'digitSum',
      digits: [1, 9],
      total: 10,
      compare: 'eq',
      threshold: 10,
    });
  });
  it('prime has no equation proof', () => {
    expect(
      evaluateBadges(97).find((h) => h.id === 'prime')?.equation,
    ).toBeUndefined();
  });
  it('twin-gate-prime fires for length-2 bookends (11)', () => {
    expect(ids(11)).toContain('twin-prime-adjacent');
    expect(ids(11)).toContain('bookends');
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
