import { createLogger, withTimeout } from './logger';
import {
  bestRollLeaderboardResponseSchema,
  type bestRollLeaderboardEntrySchema,
} from './schemas';
import type { z } from 'zod';

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

export type BestRollLeaderboardEntry = z.infer<
  typeof bestRollLeaderboardEntrySchema
>;

export type LeaderboardScope = 'ranked' | 'practice';
export type LeaderboardPeriod = 'all' | 'week';
export type LeaderboardSort = 'ep' | 'rolls' | 'badges';
export type BestRollSortBy = 'ep' | 'rarity';

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
  friendsOnly?: boolean;
  signal?: AbortSignal;
}): Promise<{
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  message?: string;
  followingCount?: number;
}> {
  const q = new URLSearchParams({
    scope: opts.scope,
    period: opts.period,
    sort: opts.sort,
    limit: String(opts.limit ?? 50),
  });
  if (opts.friendsOnly) q.set('friendsOnly', '1');
  log.info('fetch:start', {
    scope: opts.scope,
    period: opts.period,
    sort: opts.sort,
    friendsOnly: Boolean(opts.friendsOnly),
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
    message?: string;
    followingCount?: number;
  };
  if (!res.ok) throw new Error(data.error ?? 'Failed to load');
  return {
    entries: data.entries ?? [],
    me: data.me ?? null,
    message: data.message,
    followingCount: data.followingCount,
  };
}

export async function fetchBestRollLeaderboard(opts: {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  sortBy: BestRollSortBy;
  limit?: number;
  friendsOnly?: boolean;
  signal?: AbortSignal;
}): Promise<{
  entries: BestRollLeaderboardEntry[];
  me: BestRollLeaderboardEntry | null;
  message?: string;
  followingCount?: number;
}> {
  const q = new URLSearchParams({
    view: 'best',
    scope: opts.scope,
    period: opts.period,
    sortBy: opts.sortBy,
    limit: String(opts.limit ?? 50),
  });
  if (opts.friendsOnly) q.set('friendsOnly', '1');
  log.info('fetch:best:start', {
    scope: opts.scope,
    period: opts.period,
    sortBy: opts.sortBy,
    friendsOnly: Boolean(opts.friendsOnly),
  });
  const res = await withTimeout(
    fetch(`/api/leaderboard?${q}`, {
      signal: opts.signal,
      credentials: 'include',
    }),
    FETCH_MS,
    'best-roll leaderboard fetch',
  );
  const raw: unknown = await res.json();
  if (!res.ok) {
    const err =
      raw && typeof raw === 'object' && 'error' in raw
        ? String((raw as { error?: string }).error ?? 'Failed to load')
        : 'Failed to load';
    throw new Error(err);
  }
  const parsed = bestRollLeaderboardResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid best-roll leaderboard response');
  }
  return {
    entries: parsed.data.entries,
    me: parsed.data.me ?? null,
    message: parsed.data.message,
    followingCount: parsed.data.followingCount,
  };
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
