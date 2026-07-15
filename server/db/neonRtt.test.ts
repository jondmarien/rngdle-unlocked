import { describe, expect, it } from 'vite-plus/test';
import {
  getNeonRttSnapshot,
  noteNeonRoundTrip,
  runWithNeonRttCount,
} from './neonRtt.js';

describe('neonRtt counter', () => {
  it('counts notes inside runWithNeonRttCount', async () => {
    const { count, labels, result } = await runWithNeonRttCount(
      async () => {
        noteNeonRoundTrip('quota');
        noteNeonRoundTrip('identity');
        noteNeonRoundTrip('cte');
        noteNeonRoundTrip('crowns');
        expect(getNeonRttSnapshot()?.count).toBe(4);
        return 'ok';
      },
      { enabled: true },
    );
    expect(result).toBe('ok');
    expect(count).toBe(4);
    expect(labels).toEqual(['quota', 'identity', 'cte', 'crowns']);
    // Outside ALS — no active snapshot.
    expect(getNeonRttSnapshot()).toBeNull();
  });

  it('does not count when disabled', async () => {
    const { count, result } = await runWithNeonRttCount(
      async () => {
        noteNeonRoundTrip('ignored');
        return 42;
      },
      { enabled: false },
    );
    expect(result).toBe(42);
    expect(count).toBe(0);
  });

  it('documents Ranked no-crown / crown-win targets', () => {
    // Contract for api/ranked-roll logs — keep in sync with plan verification.
    const noCrownTarget = { min: 3, max: 4 };
    const crownWinTarget = { min: 4, max: 6 };
    expect(noCrownTarget.max).toBeLessThanOrEqual(crownWinTarget.max);
    expect(noCrownTarget.min).toBe(3);
    expect(crownWinTarget.max).toBe(6);
  });
});
