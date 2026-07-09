import { createLogger, withTimeout } from './logger';

const log = createLogger('leaderboard-api');
const FETCH_MS = 15_000;

export type LeaderboardEntry = {
  rank: number;
  username: string | null;
  name: string;
  lifetimeEP: number;
  lifetimeRollCount: number;
  badgeCount: number | null;
};

export type LeaderboardScope = 'ranked' | 'practice';
export type LeaderboardPeriod = 'all' | 'week';
export type LeaderboardSort = 'ep' | 'rolls' | 'badges';

export type FeedSource = 'all' | 'ranked' | 'practice';

export type FeedItem = {
  id: string;
  shortCode?: string | null;
  number: number;
  totalEP: number;
  rarity: string;
  source?: 'ranked' | 'client' | 'challenge';
  rolledAt: string;
  username: string | null;
  name: string;
  attested?: boolean;
  isMe?: boolean;
};

export async function fetchLeaderboard(opts: {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  sort: LeaderboardSort;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ entries: LeaderboardEntry[]; me: LeaderboardEntry | null }> {
  const q = new URLSearchParams({
    scope: opts.scope,
    period: opts.period,
    sort: opts.sort,
    limit: String(opts.limit ?? 50),
  });
  log.info('fetch:start', {
    scope: opts.scope,
    period: opts.period,
    sort: opts.sort,
  });
  const res = await withTimeout(
    fetch(`/api/leaderboard?${q}`, {
      signal: opts.signal,
      credentials: 'include',
    }),
    FETCH_MS,
    'leaderboard fetch',
  );
  const data = (await res.json()) as {
    error?: string;
    entries?: LeaderboardEntry[];
    me?: LeaderboardEntry | null;
  };
  if (!res.ok) throw new Error(data.error ?? 'Failed to load');
  return { entries: data.entries ?? [], me: data.me ?? null };
}

export async function fetchFeed(opts: {
  source: FeedSource;
  days?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ items: FeedItem[]; message?: string }> {
  const q = new URLSearchParams({
    source: opts.source,
    days: String(opts.days ?? 14),
    limit: String(opts.limit ?? 60),
  });
  const res = await fetch(`/api/feed?${q}`, {
    signal: opts.signal,
    credentials: 'include',
  });
  const data = (await res.json()) as {
    error?: string;
    items?: FeedItem[];
    message?: string;
  };
  if (!res.ok) throw new Error(data.error ?? 'Feed failed');
  return { items: data.items ?? [], message: data.message };
}
