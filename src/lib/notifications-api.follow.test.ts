import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { fetchFollowingList } from './notifications-api';

describe('fetchFollowingList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses enriched GET /api/follow rows', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          following: [
            {
              username: 'alice',
              name: 'Alice',
              userId: 'u1',
              since: '2026-07-01T00:00:00.000Z',
              profileAvatar: 'dice-oracle',
              profileFlair: 'Lucky',
              profileAccent: 'teal',
              image: null,
              lifetimeEP: 1200,
            },
          ],
        }),
      ),
    );

    const rows = await fetchFollowingList();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.username).toBe('alice');
    expect(rows[0]?.lifetimeEP).toBe(1200);
    expect(rows[0]?.profileAvatar).toBe('dice-oracle');
    expect(fetch).toHaveBeenCalledWith('/api/follow', {
      credentials: 'include',
    });
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );

    await expect(fetchFollowingList()).rejects.toThrow('Unauthorized');
  });
});
