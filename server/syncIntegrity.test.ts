import { describe, expect, it } from 'vite-plus/test';
import {
  assertLifetimeRollCountOk,
  SyncIntegrityError,
} from './syncIntegrity.js';

const HISTORY_CAP = 500;

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
