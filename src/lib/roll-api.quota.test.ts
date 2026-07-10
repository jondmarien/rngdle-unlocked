import { describe, expect, it } from 'vite-plus/test';
import { formatRankedResetsIn } from './roll-api';
import { rankedQuotaSchema } from './schemas';

describe('formatRankedResetsIn', () => {
  it('formats seconds under a minute', () => {
    expect(formatRankedResetsIn(45)).toBe('resets in 45s');
  });

  it('formats whole minutes', () => {
    expect(formatRankedResetsIn(42 * 60)).toBe('resets in 42m');
  });

  it('formats hours with remainder', () => {
    expect(formatRankedResetsIn(90 * 60)).toBe('resets in 1h 30m');
  });
});

describe('rankedQuotaSchema', () => {
  it('accepts full unused quota with null reset', () => {
    const q = rankedQuotaSchema.parse({
      limit: 90,
      remaining: 90,
      used: 0,
      resetsInSec: null,
      resetAt: null,
    });
    expect(q.remaining).toBe(90);
    expect(q.resetsInSec).toBeNull();
  });

  it('accepts mid-window quota', () => {
    const q = rankedQuotaSchema.parse({
      limit: 90,
      remaining: 78,
      used: 12,
      resetsInSec: 2520,
      resetAt: '2026-07-09T21:00:00.000Z',
    });
    expect(q.used).toBe(12);
  });
});
