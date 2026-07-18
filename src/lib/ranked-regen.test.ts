import { describe, expect, it } from 'vite-plus/test';
import { RANKED_REGEN_INTERVAL_MS } from './ranked-limits';
import { computeRankedRegen } from './ranked-regen';

describe('computeRankedRegen', () => {
  it('free tier never regenerates', () => {
    const r = computeRankedRegen({
      tier: 'free',
      rawUsed: 50,
      msSinceHourStart: RANKED_REGEN_INTERVAL_MS * 5,
    });
    expect(r.regenApplied).toBe(0);
    expect(r.effectiveUsed).toBe(50);
    expect(r.nextRegenInSec).toBeNull();
  });

  it('full bar (rawUsed 0) gains nothing', () => {
    const r = computeRankedRegen({
      tier: 'anomaly',
      rawUsed: 0,
      msSinceHourStart: RANKED_REGEN_INTERVAL_MS * 5,
    });
    expect(r.regenApplied).toBe(0);
    expect(r.effectiveUsed).toBe(0);
    expect(r.nextRegenInSec).toBeNull();
  });

  it('Rare: spent 5 + 1 tick → effective used 4', () => {
    const r = computeRankedRegen({
      tier: 'rare',
      rawUsed: 5,
      msSinceHourStart: RANKED_REGEN_INTERVAL_MS,
    });
    expect(r.regenPerTick).toBe(1);
    expect(r.regenApplied).toBe(1);
    expect(r.effectiveUsed).toBe(4);
  });

  it('Anomaly: 2 ticks restore 6 toward spent', () => {
    const r = computeRankedRegen({
      tier: 'anomaly',
      rawUsed: 10,
      msSinceHourStart: RANKED_REGEN_INTERVAL_MS * 2,
    });
    expect(r.regenApplied).toBe(6);
    expect(r.effectiveUsed).toBe(4);
  });

  it('cannot restore more than spent', () => {
    const r = computeRankedRegen({
      tier: 'epic',
      rawUsed: 3,
      msSinceHourStart: RANKED_REGEN_INTERVAL_MS * 10,
    });
    expect(r.regenApplied).toBe(3);
    expect(r.effectiveUsed).toBe(0);
  });
});
