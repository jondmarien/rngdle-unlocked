import { describe, expect, it } from 'vite-plus/test';
import {
  challengeResetsInSec,
  formatChallengeResetsIn,
} from './challengeCountdown';

describe('formatChallengeResetsIn', () => {
  it('formats seconds under a minute', () => {
    expect(formatChallengeResetsIn(45)).toBe('Resets in 45s');
  });

  it('formats whole minutes', () => {
    expect(formatChallengeResetsIn(42 * 60)).toBe('Resets in 42m');
  });

  it('formats hours with remainder', () => {
    expect(formatChallengeResetsIn(90 * 60)).toBe('Resets in 1h 30m');
  });

  it('formats whole hours', () => {
    expect(formatChallengeResetsIn(3 * 3600)).toBe('Resets in 3h');
  });

  it('formats days with remainder hours', () => {
    expect(formatChallengeResetsIn(3 * 86_400 + 6 * 3600)).toBe(
      'Resets in 3d 6h',
    );
  });

  it('formats whole days', () => {
    expect(formatChallengeResetsIn(2 * 86_400)).toBe('Resets in 2d');
  });
});

describe('challengeResetsInSec', () => {
  it('returns seconds until next UTC midnight for daily', () => {
    // 2026-07-10 10:00:00 UTC → ends 2026-07-11 00:00:00 UTC = 14h
    const now = Date.parse('2026-07-10T10:00:00.000Z');
    expect(challengeResetsInSec('daily', now)).toBe(14 * 3600);
  });

  it('returns seconds until next Monday UTC for weekly', () => {
    // Friday 2026-07-10 10:00 UTC → Monday 2026-07-13 00:00 UTC = 2d 14h
    const now = Date.parse('2026-07-10T10:00:00.000Z');
    expect(challengeResetsInSec('weekly', now)).toBe(2 * 86_400 + 14 * 3600);
  });
});
