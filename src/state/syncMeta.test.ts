import { describe, expect, it } from 'vite-plus/test';
import { defaultPlayStats } from '../game/stats';
import type { RollResult } from '../game/types';
import { applyAckToMeta, buildDeltaPayload, type SyncMeta } from './syncMeta';

function roll(id: string, at: string): RollResult {
  return {
    id,
    number: 1,
    badges: [],
    totalEP: 1,
    rarity: 'common',
    percentile: 50,
    rolledAt: at,
  };
}

describe('buildDeltaPayload', () => {
  it('sends only unacked rolls up to upsert cap', () => {
    const history = Array.from({ length: 80 }, (_, i) =>
      roll(`r${i}`, `2026-07-10T00:${String(i).padStart(2, '0')}:00.000Z`),
    );
    const meta: SyncMeta = {
      cursorUpdatedAt: null,
      ackedRollIds: history.slice(20).map((r) => r.id), // ack older 60
      ackedBadgeIds: [],
    };
    // history[0] is newest in our sort? rolledAt with higher minutes is later
    // buildDelta sorts newest first — r79 is newest
    const delta = buildDeltaPayload(
      {
        lifetimeEP: 100,
        lifetimeRollCount: 80,
        journeyEP: 10,
        collection: [],
        stats: defaultPlayStats(),
        history,
      },
      meta,
    );
    expect(delta.mode).toBe('delta');
    expect(delta.history.length).toBeLessThanOrEqual(60);
    expect(delta.history.every((r) => !meta.ackedRollIds.includes(r.id))).toBe(
      true,
    );
  });

  it('applyAckToMeta records sent ids', () => {
    const meta: SyncMeta = {
      cursorUpdatedAt: null,
      ackedRollIds: [],
      ackedBadgeIds: [],
    };
    const next = applyAckToMeta(
      meta,
      '2026-07-10T12:00:00.000Z',
      {
        history: [roll('a', '2026-07-10T11:00:00.000Z')],
        collection: [{ badgeId: 'b1', family: 'math', firstEarnedAt: 'x' }],
      },
      new Set(['a', 'b']),
    );
    expect(next.cursorUpdatedAt).toBe('2026-07-10T12:00:00.000Z');
    expect(next.ackedRollIds).toContain('a');
    expect(next.ackedBadgeIds).toContain('b1');
  });
});
