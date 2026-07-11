import { describe, expect, it } from 'vite-plus/test';
import {
  LIFETIME_EP_BADGES,
  lifetimeEpBadgesForEp,
  newlyUnlockedLifetimeEp,
  sumLifetimeEpAward,
} from './lifetimeEp';

describe('lifetime EP milestones', () => {
  it('has 22 thresholds matching Journey count', () => {
    expect(LIFETIME_EP_BADGES).toHaveLength(22);
  });

  it('unlocks exactly on threshold cross', () => {
    expect(newlyUnlockedLifetimeEp(999, 1000).map((b) => b.id)).toEqual([
      'ep-1000',
    ]);
    expect(newlyUnlockedLifetimeEp(1000, 1000)).toEqual([]);
    expect(
      newlyUnlockedLifetimeEp(999_999, 1_000_000).map((b) => b.id),
    ).toEqual(['ep-1000000']);
  });

  it('can unlock multiple when jumping', () => {
    const ids = newlyUnlockedLifetimeEp(0, 25_000).map((b) => b.id);
    expect(ids).toEqual(['ep-1000', 'ep-5000', 'ep-10000', 'ep-25000']);
  });

  it('lifetimeEpBadgesForEp includes all reached (backfill source)', () => {
    const ids = lifetimeEpBadgesForEp(4_827_699).map((b) => b.id);
    expect(ids).toContain('ep-1000');
    expect(ids).toContain('ep-3000000');
    expect(ids).not.toContain('ep-5000000');
    expect(ids).toHaveLength(11);
  });

  it('backfill award sum is non-zero but callers skip applying it', () => {
    const defs = lifetimeEpBadgesForEp(4_827_699);
    expect(sumLifetimeEpAward(defs)).toBeGreaterThan(0);
  });

  it('attaches custom art paths for every milestone', () => {
    const all = lifetimeEpBadgesForEp(500_000_000);
    expect(all).toHaveLength(22);
    for (const b of all) {
      expect(b.image).toBe(`/lifetime-ep/${b.id.replace('ep-', '')}.jpg`);
      expect(b.family).toBe('lifetime');
    }
  });

  it('live unlock past backfill window awards only new tiers', () => {
    expect(
      newlyUnlockedLifetimeEp(4_827_699, 5_000_100).map((b) => b.id),
    ).toEqual(['ep-5000000']);
  });
});
