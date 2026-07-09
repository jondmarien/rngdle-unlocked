import { describe, expect, it } from 'vite-plus/test';
import {
  buildPeriodSeed,
  challengeNumber,
  utcDateKey,
  utcWeekKey,
} from './challenge';
import { ROLL_MAX } from './rng';

describe('challenge seeds', () => {
  it('builds stable daily/weekly keys', () => {
    const d = new Date('2026-07-08T15:00:00.000Z');
    expect(utcDateKey(d)).toBe('2026-07-08');
    expect(utcWeekKey(d)).toMatch(/^2026-W\d{2}$/);
    const daily = buildPeriodSeed('daily', d);
    expect(daily.seed).toBe('rngdle:daily:2026-07-08');
    expect(daily.periodKey).toBe('2026-07-08');
  });

  it('challengeNumber is deterministic and in range', async () => {
    const a = await challengeNumber('rngdle:daily:2026-07-08', 'user-1');
    const b = await challengeNumber('rngdle:daily:2026-07-08', 'user-1');
    const c = await challengeNumber('rngdle:daily:2026-07-08', 'user-2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(ROLL_MAX);
  });
});
