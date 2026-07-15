import { describe, expect, it } from 'vite-plus/test';
import {
  buildPeriodSeed,
  challengeKeyForPeriod,
  challengeNumber,
  findChallengeRollForPeriod,
  startOfUtcDay,
  startOfUtcIsoWeek,
  utcDateKey,
  utcWeekKey,
} from './challenge';
import { ROLL_MAX } from './rng';
import type { RollResult } from './types';

describe('challenge seeds', () => {
  it('builds stable daily/weekly keys', () => {
    const d = new Date('2026-07-08T15:00:00.000Z');
    expect(utcDateKey(d)).toBe('2026-07-08');
    expect(utcWeekKey(d)).toMatch(/^2026-W\d{2}$/);
    const daily = buildPeriodSeed('daily', d);
    expect(daily.seed).toBe('rngdle:daily:2026-07-08');
    expect(daily.periodKey).toBe('2026-07-08');
    expect(challengeKeyForPeriod('daily', d)).toBe('daily:2026-07-08');
  });

  it('startOfUtcDay / startOfUtcIsoWeek use UTC calendar boundaries', () => {
    const wed = new Date('2026-07-08T15:00:00.000Z'); // Wednesday
    expect(startOfUtcDay(wed).toISOString()).toBe('2026-07-08T00:00:00.000Z');
    expect(startOfUtcIsoWeek(wed).toISOString()).toBe(
      '2026-07-06T00:00:00.000Z',
    ); // Monday
    const sun = new Date('2026-07-12T01:00:00.000Z');
    expect(startOfUtcIsoWeek(sun).toISOString()).toBe(
      '2026-07-06T00:00:00.000Z',
    );
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

  it('findChallengeRollForPeriod returns newest matching key', () => {
    const d = new Date('2026-07-08T15:00:00.000Z');
    const key = challengeKeyForPeriod('daily', d);
    const older = {
      id: 'a',
      challengeKey: key,
      number: 1,
    } as RollResult;
    const newer = {
      id: 'b',
      challengeKey: key,
      number: 2,
    } as RollResult;
    const other = {
      id: 'c',
      challengeKey: 'weekly:2026-W28',
      number: 3,
    } as RollResult;
    expect(
      findChallengeRollForPeriod([newer, older, other], 'daily', d)?.id,
    ).toBe('b');
    expect(findChallengeRollForPeriod([other], 'daily', d)).toBeUndefined();
  });
});
