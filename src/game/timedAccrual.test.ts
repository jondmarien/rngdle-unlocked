import { describe, expect, it } from 'vite-plus/test';
import { accrueDiscreteTicks, accrueRate } from './timedAccrual';

describe('accrueRate', () => {
  it('earns by hourly rate', () => {
    const r = accrueRate({
      elapsedMs: 3 * 3_600_000,
      ratePerHour: 2,
      room: 100,
    });
    expect(r.accrued).toBe(6);
  });

  it('caps offline window', () => {
    const r = accrueRate({
      elapsedMs: 48 * 3_600_000,
      ratePerHour: 2,
      room: 100,
      maxOfflineMs: 12 * 3_600_000,
    });
    expect(r.accrued).toBe(24);
  });

  it('respects room', () => {
    const r = accrueRate({
      elapsedMs: 12 * 3_600_000,
      ratePerHour: 2,
      room: 5,
    });
    expect(r.accrued).toBe(5);
  });
});

describe('accrueDiscreteTicks', () => {
  const interval = 360_000;

  it('applies whole ticks only', () => {
    const r = accrueDiscreteTicks({
      elapsedMs: interval * 2 + 1_000,
      intervalMs: interval,
      amountPerTick: 1,
      maxAccrue: 100,
    });
    expect(r.ticks).toBe(2);
    expect(r.accrued).toBe(2);
  });

  it('caps by maxAccrue (refill toward spent)', () => {
    const r = accrueDiscreteTicks({
      elapsedMs: interval * 10,
      intervalMs: interval,
      amountPerTick: 3,
      maxAccrue: 5,
    });
    expect(r.accrued).toBe(5);
  });

  it('zero amount yields null next tick', () => {
    const r = accrueDiscreteTicks({
      elapsedMs: interval * 5,
      intervalMs: interval,
      amountPerTick: 0,
      maxAccrue: 50,
    });
    expect(r.accrued).toBe(0);
    expect(r.msToNextTick).toBeNull();
  });
});
