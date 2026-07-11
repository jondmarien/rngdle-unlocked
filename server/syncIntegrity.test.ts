import { describe, expect, it } from 'vite-plus/test';
import {
  assertLifetimeRollCountOk,
  isRollExplainableBadge,
  SyncIntegrityError,
} from './syncIntegrity.js';

const HISTORY_CAP = 500;

describe('isRollExplainableBadge', () => {
  it('excludes journey, lifetime, and secret seals from roll explanation', () => {
    expect(
      isRollExplainableBadge({
        badgeId: 'rolls-100',
        firstEarnedAt: '',
        family: 'journey',
      }),
    ).toBe(false);
    expect(
      isRollExplainableBadge({
        badgeId: 'ep-1000',
        firstEarnedAt: '',
        family: 'lifetime',
      }),
    ).toBe(false);
    expect(
      isRollExplainableBadge({
        badgeId: 'secret-master-lifetime',
        firstEarnedAt: '',
        family: 'secret',
      }),
    ).toBe(false);
  });

  it('treats number-family badges as roll-explainable', () => {
    expect(
      isRollExplainableBadge({
        badgeId: 'prime',
        firstEarnedAt: '',
        family: 'math',
      }),
    ).toBe(true);
  });
});

describe('assertLifetimeRollCountOk', () => {
  it('allows first sync when lifetime exceeds history cap', () => {
    expect(() =>
      assertLifetimeRollCountOk({
        claimedRollCount: 506,
        cloudRollCount: 0,
        newRollCount: HISTORY_CAP,
        historyLength: HISTORY_CAP,
      }),
    ).not.toThrow();
  });

  it('allows large deltas when history window is full', () => {
    expect(() =>
      assertLifetimeRollCountOk({
        claimedRollCount: 2_500,
        cloudRollCount: 1_000,
        newRollCount: HISTORY_CAP,
        historyLength: HISTORY_CAP,
      }),
    ).not.toThrow();
  });

  it('rejects inflated count when history is below the cap', () => {
    expect(() =>
      assertLifetimeRollCountOk({
        claimedRollCount: 100,
        cloudRollCount: 0,
        newRollCount: 10,
        historyLength: 10,
      }),
    ).toThrow(SyncIntegrityError);
  });

  it('allows modest slack below the cap', () => {
    expect(() =>
      assertLifetimeRollCountOk({
        claimedRollCount: 15,
        cloudRollCount: 0,
        newRollCount: 10,
        historyLength: 10,
      }),
    ).not.toThrow();
  });
});
