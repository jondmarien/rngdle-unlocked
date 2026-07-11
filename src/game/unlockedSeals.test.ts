import { describe, expect, it } from 'vite-plus/test';
import { listUnlockedSeals } from './unlockedSeals';

describe('listUnlockedSeals', () => {
  it('returns empty for empty collection', () => {
    expect(listUnlockedSeals([])).toEqual([]);
  });

  it('includes journey and omega when present', () => {
    const seals = listUnlockedSeals(['rolls-1500', 'secret-omega-codex']);
    expect(seals.map((s) => s.id)).toEqual([
      'rolls-1500',
      'secret-omega-codex',
    ]);
    expect(seals[0]?.name).toBeTruthy();
  });
});
