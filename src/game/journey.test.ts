import { describe, expect, it } from 'vite-plus/test';
import { newlyUnlockedJourney, journeyBadgesForCount } from './journey';

describe('journey milestones', () => {
  it('unlocks exactly on threshold cross', () => {
    expect(newlyUnlockedJourney(4, 5).map((b) => b.id)).toEqual(['rolls-5']);
    expect(newlyUnlockedJourney(5, 5)).toEqual([]);
    expect(newlyUnlockedJourney(99, 100).map((b) => b.id)).toEqual(['rolls-100']);
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
});
