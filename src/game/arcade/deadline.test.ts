import { describe, expect, it } from 'vite-plus/test';
import {
  deadlineInitialRolls,
  deadlineSuccessBonus,
  deadlineTargetFromDigits,
  tickDeadline,
} from './deadline';

describe('deadline helpers', () => {
  it('floors target at 20 for low Digits', () => {
    expect(deadlineTargetFromDigits(0)).toBe(20);
    expect(deadlineTargetFromDigits(5)).toBe(20);
  });

  it('scales target by 1.75', () => {
    expect(deadlineTargetFromDigits(40)).toBe(70);
    expect(deadlineTargetFromDigits(100)).toBe(175);
  });

  it('success bonus is 25% of target ceil', () => {
    expect(deadlineSuccessBonus(20)).toBe(5);
    expect(deadlineSuccessBonus(70)).toBe(18);
  });

  it('starts with 6 rolls', () => {
    expect(deadlineInitialRolls()).toBe(6);
  });

  it('tick: inactive when target/rolls zero', () => {
    expect(
      tickDeadline({
        digitsAfterAward: 50,
        target: 0,
        rollsRemainingBefore: 0,
      }),
    ).toEqual({ kind: 'inactive' });
  });

  it('tick: success when digits hit target', () => {
    expect(
      tickDeadline({
        digitsAfterAward: 70,
        target: 70,
        rollsRemainingBefore: 3,
      }),
    ).toEqual({ kind: 'success', bonusDigits: 18 });
  });

  it('tick: progress then bust', () => {
    expect(
      tickDeadline({
        digitsAfterAward: 10,
        target: 70,
        rollsRemainingBefore: 2,
      }),
    ).toEqual({ kind: 'progress', rollsRemaining: 1 });
    expect(
      tickDeadline({
        digitsAfterAward: 10,
        target: 70,
        rollsRemainingBefore: 1,
      }),
    ).toEqual({ kind: 'bust' });
  });
});
