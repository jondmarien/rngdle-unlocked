import { describe, expect, it } from 'vite-plus/test';
import { computeIdleAccrual, previewIdlePending } from './idle';

describe('idle Digits accrual', () => {
  const t0 = new Date('2026-07-14T00:00:00.000Z');

  it('earns 2 Digits per hour', () => {
    const now = new Date(t0.getTime() + 3 * 3_600_000);
    const r = computeIdleAccrual({
      lastClaimAt: t0,
      now,
      currentBank: 0,
    });
    expect(r.digitsEarned).toBe(6);
    expect(r.nextBank).toBe(6);
  });

  it('caps offline at 12 hours (24 Digits)', () => {
    const now = new Date(t0.getTime() + 48 * 3_600_000);
    const r = computeIdleAccrual({
      lastClaimAt: t0,
      now,
      currentBank: 0,
    });
    expect(r.digitsEarned).toBe(24);
  });

  it('respects bank cap of 100', () => {
    const now = new Date(t0.getTime() + 12 * 3_600_000);
    const r = computeIdleAccrual({
      lastClaimAt: t0,
      now,
      currentBank: 95,
    });
    expect(r.digitsEarned).toBe(5);
    expect(r.nextBank).toBe(100);
  });

  it('preview matches compute earned', () => {
    const now = new Date(t0.getTime() + 2 * 3_600_000);
    expect(previewIdlePending({ lastClaimAt: t0, now, currentBank: 0 })).toBe(
      4,
    );
  });
});
