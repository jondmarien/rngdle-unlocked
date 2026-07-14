import { describe, expect, it } from 'vite-plus/test';
import { evaluateBadges } from './index';
import { atomicNumberFromRoll } from './matchers';
import { ATOMIC_REGISTRY_BADGES, ATOMIC_REGISTRY_META } from './atomicRegistry';

describe('atomicNumberFromRoll', () => {
  it('extracts last three digits as Z in 1..118', () => {
    expect(atomicNumberFromRoll(447_079)).toBe(79);
    expect(atomicNumberFromRoll(5001)).toBe(1);
    expect(atomicNumberFromRoll(79)).toBe(79);
    expect(atomicNumberFromRoll(5)).toBe(5);
  });

  it('rejects 000 and 119..999 remainders', () => {
    expect(atomicNumberFromRoll(0)).toBeNull();
    expect(atomicNumberFromRoll(1000)).toBeNull();
    expect(atomicNumberFromRoll(1_000_000)).toBeNull();
    expect(atomicNumberFromRoll(119)).toBeNull();
    expect(atomicNumberFromRoll(999)).toBeNull();
  });
});

describe('ATOMIC_REGISTRY_BADGES', () => {
  it('has exactly one badge per Z 1..118 with approved EP', () => {
    expect(ATOMIC_REGISTRY_BADGES).toHaveLength(118);
    expect(ATOMIC_REGISTRY_META).toHaveLength(118);
    const zs = ATOMIC_REGISTRY_META.map((m) => m.z).sort((a, b) => a - b);
    expect(zs).toEqual(Array.from({ length: 118 }, (_, i) => i + 1));

    const epByZ = Object.fromEntries(
      ATOMIC_REGISTRY_META.map((m) => [m.z, m.ep]),
    );
    expect(epByZ[1]).toBe(80);
    expect(epByZ[79]).toBe(280);
    expect(epByZ[21]).toBe(900);
    expect(epByZ[78]).toBe(2500);
    expect(epByZ[57]).toBe(4000);
    expect(epByZ[43]).toBe(8000);
    expect(epByZ[118]).toBe(25_000);
  });

  it('matches exactly one atomic badge for a hit roll', () => {
    const hits = evaluateBadges(447_079).filter(
      (b) => b.family === 'atomic-registry',
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe('atomic-z-79');
    expect(hits[0]?.name).toBe('Gold');
    expect(hits[0]?.emoji).toBe('Au');
  });

  it('matches none outside 1..118 remainder', () => {
    const hits = evaluateBadges(1000).filter(
      (b) => b.family === 'atomic-registry',
    );
    expect(hits).toHaveLength(0);
  });

  it('ids are atomic-z-{n}', () => {
    for (const b of ATOMIC_REGISTRY_BADGES) {
      expect(b.id).toMatch(/^atomic-z-\d+$/);
      expect(b.family).toBe('atomic-registry');
    }
  });
});
