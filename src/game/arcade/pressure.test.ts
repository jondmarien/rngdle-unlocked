import { describe, expect, it } from 'vite-plus/test';
import {
  applySoftFailHalf,
  tickTrashStreak,
  trashSoftFailPenalty,
  trashStreakThreshold,
} from './pressure';

describe('trash streak soft-fail', () => {
  it('threshold is 3', () => {
    expect(trashStreakThreshold()).toBe(3);
  });

  it('penalty is 15% floored with min 2', () => {
    expect(trashSoftFailPenalty(100)).toBe(15);
    expect(trashSoftFailPenalty(10)).toBe(2);
    expect(trashSoftFailPenalty(0)).toBe(0);
  });

  it('halves awards with min 1', () => {
    expect(applySoftFailHalf(10)).toBe(5);
    expect(applySoftFailHalf(1)).toBe(1);
    expect(applySoftFailHalf(0)).toBe(0);
  });

  it('builds streak and triggers at 3 trash', () => {
    const a = tickTrashStreak({
      rarity: 'trash',
      trashStreakBefore: 0,
      softFailRollsRemainingBefore: 0,
      digitsBeforePenalty: 40,
    });
    expect(a.trashStreakAfter).toBe(1);
    expect(a.triggeredSoftFail).toBe(false);

    const b = tickTrashStreak({
      rarity: 'trash',
      trashStreakBefore: 2,
      softFailRollsRemainingBefore: 0,
      digitsBeforePenalty: 40,
    });
    expect(b.triggeredSoftFail).toBe(true);
    expect(b.trashStreakAfter).toBe(0);
    expect(b.softFailRollsRemainingAfter).toBe(3);
    expect(b.penaltyDigits).toBe(6);
  });

  it('non-trash resets streak', () => {
    const r = tickTrashStreak({
      rarity: 'common',
      trashStreakBefore: 2,
      softFailRollsRemainingBefore: 0,
      digitsBeforePenalty: 40,
    });
    expect(r.trashStreakAfter).toBe(0);
  });
});
