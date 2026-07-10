import { describe, expect, it } from 'vite-plus/test';
import { newlyUnlockedJourney, journeyBadgesForCount } from './journey';

describe('journey milestones', () => {
  it('unlocks exactly on threshold cross', () => {
    expect(newlyUnlockedJourney(4, 5).map((b) => b.id)).toEqual(['rolls-5']);
    expect(newlyUnlockedJourney(5, 5)).toEqual([]);
    expect(newlyUnlockedJourney(99, 100).map((b) => b.id)).toEqual([
      'rolls-100',
    ]);
  });

  it('can unlock multiple when jumping', () => {
    const ids = newlyUnlockedJourney(0, 20).map((b) => b.id);
    expect(ids).toEqual(['rolls-5', 'rolls-10', 'rolls-15', 'rolls-20']);
  });

  it('journeyBadgesForCount includes all reached', () => {
    expect(journeyBadgesForCount(50).map((b) => b.id)).toContain('rolls-50');
    expect(journeyBadgesForCount(50).map((b) => b.id)).toContain('rolls-5');
    expect(journeyBadgesForCount(4)).toEqual([]);
  });

  it('extends to 100000', () => {
    const ids = journeyBadgesForCount(100_000).map((b) => b.id);
    expect(ids).toContain('rolls-10000');
    expect(ids).toContain('rolls-50000');
    expect(ids).toContain('rolls-100000');
    expect(newlyUnlockedJourney(99999, 100000).map((b) => b.id)).toEqual([
      'rolls-100000',
    ]);
  });

  it('attaches custom art paths for every milestone', () => {
    const all = journeyBadgesForCount(100_000);
    expect(all).toHaveLength(22);
    for (const b of all) {
      expect(b.image).toBe(`/journey/${b.id.replace('rolls-', '')}.jpg`);
    }
  });
});
