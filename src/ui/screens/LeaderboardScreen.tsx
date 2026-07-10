import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { coerceRarity } from '../../game';
import { fetchArcadeLeaderboard } from '../../lib/arcade-api';
import { useSession } from '../../lib/auth-client';
import { formatDateTime } from '../../lib/format';
import {
  fetchBestRollLeaderboard,
  fetchFeed,
  fetchLeaderboard,
  type BestRollSortBy,
  type FeedSource,
  type LeaderboardSort,
} from '../../lib/leaderboard-api';
import {
  fetchFollowingUsernames,
  followUser,
  unfollowUser,
} from '../../lib/notifications-api';
import { FindPlayers } from '../components/FindPlayers';
import { RarityBadge } from '../components/RarityBadge';
import { SegmentedToggle } from '../components/SegmentedToggle';

/** Mode-first primary tabs (replaces Board/Feed/Find + nested Ranked/Practice). */
type BoardView = 'ranked' | 'practice' | 'arcade' | 'feed' | 'find';

/** Collapsed metric + sort for Ranked / Practice. */
type BoardMetricKey =
  | 'total-ep'
  | 'total-rolls'
  | 'total-badges'
  | 'best-ep'
  | 'best-rarity';

function metricToState(key: BoardMetricKey): {
  metric: 'total' | 'best';
  sort: LeaderboardSort;
  sortBy: BestRollSortBy;
} {
  switch (key) {
    case 'total-ep':
      return { metric: 'total', sort: 'ep', sortBy: 'ep' };
    case 'total-rolls':
      return { metric: 'total', sort: 'rolls', sortBy: 'ep' };
    case 'total-badges':
      return { metric: 'total', sort: 'badges', sortBy: 'ep' };
    case 'best-ep':
      return { metric: 'best', sort: 'ep', sortBy: 'ep' };
    case 'best-rarity':
      return { metric: 'best', sort: 'ep', sortBy: 'rarity' };
    default: {
      const _exhaustive: never = key;
      void _exhaustive;
      return { metric: 'total', sort: 'ep', sortBy: 'ep' };
    }
  }
}

export function LeaderboardScreen({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void;
}) {
  const { data: session } = useSession();
  const myUsername = session?.user.username ?? null;

  const [view, setView] = useState<BoardView>('ranked');
  const [metricKey, setMetricKey] = useState<BoardMetricKey>('total-ep');
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const [feedSource, setFeedSource] = useState<FeedSource>('all');
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<string | null>(null);

  const { metric, sort, sortBy } = metricToState(metricKey);
  const scope = view === 'practice' ? 'practice' : 'ranked';
  const onEpBoard = view === 'ranked' || view === 'practice';

  // Ranked has no badges sort — coerce if needed
  const effectiveSort: LeaderboardSort =
    scope === 'ranked' && sort === 'badges' ? 'ep' : sort;
  const effectiveMetricKey: BoardMetricKey =
    scope === 'ranked' && metricKey === 'total-badges' ? 'total-ep' : metricKey;

  useEffect(() => {
    if (session?.user) {
      void fetchFollowingUsernames().then(setFollowing);
    } else {
      setFollowing(new Set());
    }
  }, [session?.user]);

  useEffect(() => {
    if (
      metricKey === 'total-badges' &&
      (scope === 'ranked' || period !== 'all')
    ) {
      setMetricKey('total-ep');
    }
  }, [metricKey, scope, period]);

  const boardQuery = useQuery({
    queryKey: ['leaderboard', scope, period, effectiveSort],
    queryFn: ({ signal }) =>
      fetchLeaderboard({
        scope,
        period,
        sort: effectiveSort,
        limit: 50,
        signal,
      }),
    enabled: onEpBoard && metric === 'total',
  });
  const bestQuery = useQuery({
    queryKey: ['leaderboard-best', scope, period, sortBy],
    queryFn: ({ signal }) =>
      fetchBestRollLeaderboard({
        scope,
        period,
        sortBy,
        limit: 50,
        signal,
      }),
    enabled: onEpBoard && metric === 'best',
  });

  const arcadeQuery = useQuery({
    queryKey: ['arcade-leaderboard'],
    queryFn: ({ signal }) => fetchArcadeLeaderboard({ limit: 50, signal }),
    enabled: view === 'arcade',
  });

  const entries = boardQuery.data?.entries ?? [];
  const me = boardQuery.data?.me ?? null;
  const bestEntries = bestQuery.data?.entries ?? [];
  const bestMe = bestQuery.data?.me ?? null;
  const arcadeEntries = arcadeQuery.data?.entries ?? [];
  const arcadeMe = arcadeQuery.data?.me ?? null;

  const activeQuery = metric === 'best' ? bestQuery : boardQuery;
  const loading =
    (onEpBoard && activeQuery.isPending) ||
    (view === 'arcade' && arcadeQuery.isPending);
  const error = (() => {
    if (view === 'arcade' && arcadeQuery.error) {
      return arcadeQuery.error instanceof Error
        ? arcadeQuery.error.message
        : 'Failed';
    }
    if (onEpBoard && activeQuery.error) {
      return activeQuery.error instanceof Error
        ? activeQuery.error.message
        : 'Failed';
    }
    return null;
  })();

  const feedQuery = useQuery({
    queryKey: ['feed', feedSource],
    queryFn: ({ signal }) =>
      fetchFeed({ source: feedSource, days: 14, limit: 60, signal }),
    enabled: view === 'feed' && Boolean(session?.user),
  });
  const feed = session?.user ? (feedQuery.data?.items ?? []) : [];
  const feedLoading =
    view === 'feed' && Boolean(session?.user) && feedQuery.isPending;
  const feedError = !session?.user
    ? 'Sign in to see your rolls and people you follow.'
    : feedQuery.error
      ? feedQuery.error instanceof Error
        ? feedQuery.error.message
        : 'Failed'
      : (feedQuery.data?.message ?? null);

  const toggleFollow = async (username: string) => {
    if (!session?.user) return;
    const key = username.toLowerCase();
    setFollowBusy(key);
    try {
      if (following.has(key)) {
        await unfollowUser(username);
        const next = new Set(following);
        next.delete(key);
        setFollowing(next);
      } else {
        await followUser(username);
        const next = new Set(following);
        next.add(key);
        setFollowing(next);
      }
    } catch {
      /* keep previous following set */
    } finally {
      setFollowBusy(null);
    }
  };

  const meOnPage =
    view === 'arcade'
      ? arcadeMe &&
        arcadeEntries.some(
          (e) =>
            e.username &&
            arcadeMe.username &&
            e.username.toLowerCase() === arcadeMe.username.toLowerCase(),
        )
      : metric === 'best'
        ? bestMe &&
          bestEntries.some(
            (e) =>
              e.username &&
              bestMe.username &&
              e.username.toLowerCase() === bestMe.username.toLowerCase(),
          )
        : me &&
          entries.some(
            (e) =>
              e.username &&
              me.username &&
              e.username.toLowerCase() === me.username.toLowerCase(),
          );

  const metricOptions: { id: BoardMetricKey; label: string }[] = [
    { id: 'total-ep', label: 'Total EP' },
    { id: 'total-rolls', label: 'Total · Rolls' },
    ...(scope === 'practice' && period === 'all'
      ? [{ id: 'total-badges' as const, label: 'Total · Badges' }]
      : []),
    { id: 'best-ep', label: 'Best Roll · EP' },
    { id: 'best-rarity', label: 'Best Roll · Rarity' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-[var(--prose-2)]">
          <strong className="text-[var(--prose)]">Ranked</strong> (server free
          play) and <strong className="text-[var(--prose)]">Practice</strong>{' '}
          (synced Free play) use EP.{' '}
          <strong className="text-[var(--prose)]">Arcade</strong> ranks best
          Digits run — separate from EP. Feed and Find stay social.
        </p>
      </div>

      <SegmentedToggle
        options={[
          { id: 'ranked', label: 'Ranked', accent: 'amber' },
          { id: 'practice', label: 'Practice' },
          { id: 'arcade', label: 'Arcade' },
          { id: 'feed', label: 'Feed' },
          { id: 'find', label: 'Find' },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'find' && (
        <FindPlayers
          following={following}
          onFollowingChange={setFollowing}
          onOpenProfile={onOpenProfile}
        />
      )}

      {view === 'feed' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--prose-2)]">
            Public rolls from{' '}
            <strong className="text-[var(--prose)]">you</strong> and people you
            follow (last 14 days). Use Find or + on the board to follow others.
          </p>
          <SegmentedToggle
            options={[
              { id: 'all', label: 'All' },
              { id: 'ranked', label: 'Ranked' },
              { id: 'practice', label: 'Free play' },
            ]}
            value={feedSource}
            onChange={setFeedSource}
          />
          <p className="text-xs text-[var(--prose-3)]">
            {feedSource === 'ranked'
              ? 'Server Ranked free-play rolls only.'
              : feedSource === 'practice'
                ? 'Client Free play + challenge rolls (not Ranked).'
                : 'Both Ranked and Free play public rolls.'}
          </p>
          {feedLoading && (
            <p className="text-sm text-[var(--prose-2)]">Loading feed…</p>
          )}
          {feedError && (
            <p className="text-sm text-[var(--prose-2)]">{feedError}</p>
          )}
          {!feedLoading && feed.length === 0 && !feedError && (
            <p className="text-sm text-[var(--prose-2)]">
              No public rolls in this lane yet. Roll Free or Ranked, or follow
              players from Ranked / Practice / Find.
            </p>
          )}
          <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
            {feed.map((item) => {
              const isMe =
                item.isMe ||
                (myUsername &&
                  item.username &&
                  item.username.toLowerCase() === myUsername.toLowerCase());
              const lane =
                item.source === 'ranked'
                  ? 'Ranked'
                  : item.source === 'challenge'
                    ? 'Challenge'
                    : 'Free play';
              return (
                <li
                  key={`${item.id}-${item.rolledAt}`}
                  className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                    isMe
                      ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                      : ''
                  }`}
                >
                  <div>
                    <button
                      type="button"
                      className="font-bold hover:underline"
                      onClick={() =>
                        item.username && onOpenProfile(item.username)
                      }
                    >
                      @{item.username}
                      {isMe && (
                        <span className="ml-1.5 text-xs font-bold text-[var(--accent)]">
                          you
                        </span>
                      )}
                    </button>
                    <div className="mono-number text-lg font-bold">
                      {item.number.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[var(--prose-3)]">
                      {lane}
                      {item.rolledAt
                        ? ` · ${new Date(item.rolledAt).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-sm text-[var(--prose-2)]">
                    <span className="font-semibold capitalize text-amber-600 dark:text-amber-400">
                      {item.rarity}
                    </span>
                    {' · '}
                    {item.totalEP.toLocaleString()} EP
                    {item.attested ? ' · sealed' : ''}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {view === 'arcade' && (
        <>
          <p className="text-xs leading-snug text-[var(--prose-3)]">
            Best single Arcade run (Digits). Separate from EP — play from the
            Arcade tab.
          </p>

          {arcadeMe && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-[var(--accent)] bg-[var(--surface-raised)]'
                  : 'border-[var(--outline)] bg-[var(--surface)]'
              }`}
            >
              <span className="text-sm font-semibold text-[var(--prose-2)]">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{arcadeMe.rank}{' '}
                  {arcadeMe.username ? `@${arcadeMe.username}` : arcadeMe.name}
                  <span className="ml-2 rounded bg-[var(--prose)] px-1.5 py-0.5 text-xs text-[var(--bg)]">
                    you
                  </span>
                </span>
                <span className="text-sm text-[var(--prose-2)]">
                  {arcadeMe.bestRunScore.toLocaleString()} Digits ·{' '}
                  {arcadeMe.totalRunsCompleted.toLocaleString()} runs
                </span>
              </div>
            </div>
          )}

          {session?.user && !loading && !arcadeMe && (
            <p className="text-sm text-[var(--prose-2)]">
              Claim @username and complete an Arcade run to place here.
            </p>
          )}

          {loading && <p className="text-sm text-[var(--prose-2)]">Loading…</p>}
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}

          <ol className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
            {arcadeEntries.map((e) => {
              const isMe =
                (myUsername &&
                  e.username &&
                  e.username.toLowerCase() === myUsername.toLowerCase()) ||
                (arcadeMe?.username &&
                  e.username &&
                  e.username.toLowerCase() === arcadeMe.username.toLowerCase());
              const uname = e.username?.toLowerCase() ?? '';
              const isFollowing = uname ? following.has(uname) : false;
              return (
                <li
                  key={`arcade-${e.rank}-${e.username}`}
                  className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                    isMe
                      ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-[var(--accent)]'
                      : ''
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="mono-number w-8 text-[var(--prose-2)]">
                      #{e.rank}
                    </span>
                    <button
                      type="button"
                      className="truncate text-left font-bold hover:underline"
                      onClick={() => e.username && onOpenProfile(e.username)}
                      disabled={!e.username}
                    >
                      {e.username ? `@${e.username}` : e.name}
                      {isMe && (
                        <span className="ml-2 text-xs font-bold text-[var(--accent)]">
                          you
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm text-[var(--prose-2)]">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {e.bestRunScore.toLocaleString()} Digits
                      </span>
                      {' · '}
                      {e.totalRunsCompleted.toLocaleString()} runs
                    </div>
                    {session?.user && e.username && !isMe && (
                      <button
                        type="button"
                        title={isFollowing ? 'Unfollow' : 'Follow'}
                        disabled={followBusy === uname}
                        onClick={() => void toggleFollow(e.username!)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold leading-none ${
                          isFollowing
                            ? 'border-[var(--outline)] text-[var(--prose-2)]'
                            : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                        }`}
                      >
                        {isFollowing ? '✓' : '+'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {onEpBoard && (
        <>
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--prose-3)]">
              Metric
            </label>
            <select
              className="w-full max-w-md rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2.5 py-2 text-sm font-semibold"
              value={effectiveMetricKey}
              onChange={(e) => setMetricKey(e.target.value as BoardMetricKey)}
            >
              {metricOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-snug text-[var(--prose-3)]">
              {view === 'ranked'
                ? 'Only rolls from Roll → Ranked (server CSPRNG). Sign-in + @username required. Crowns use this board too.'
                : metric === 'best'
                  ? 'Public Free play + challenge rolls (not Ranked). One personal best per player.'
                  : 'Synced Free play progress (all-time) and public practice rolls this week. Social — not anti-cheat competitive.'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--prose-3)]">
              Period
            </span>
            <SegmentedToggle
              chipClassName="rounded-md border px-2 py-1 text-xs font-semibold"
              options={[
                { id: 'all', label: 'All-time' },
                { id: 'week', label: 'This week' },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>

          {metric === 'total' && me && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-[var(--accent)] bg-[var(--surface-raised)]'
                  : 'border-[var(--outline)] bg-[var(--surface)]'
              }`}
            >
              <span className="text-sm font-semibold text-[var(--prose-2)]">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{me.rank} {me.username ? `@${me.username}` : me.name}
                  <span className="ml-2 rounded bg-[var(--prose)] px-1.5 py-0.5 text-xs text-[var(--bg)]">
                    you
                  </span>
                </span>
                <span className="text-sm text-[var(--prose-2)]">
                  {me.lifetimeEP.toLocaleString()} EP ·{' '}
                  {me.lifetimeRollCount.toLocaleString()} rolls
                </span>
              </div>
            </div>
          )}

          {metric === 'best' && bestMe && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-[var(--accent)] bg-[var(--surface-raised)]'
                  : 'border-[var(--outline)] bg-[var(--surface)]'
              }`}
            >
              <span className="text-sm font-semibold text-[var(--prose-2)]">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{bestMe.rank}{' '}
                  {bestMe.username ? `@${bestMe.username}` : bestMe.name}
                  <span className="ml-2 rounded bg-[var(--prose)] px-1.5 py-0.5 text-xs text-[var(--bg)]">
                    you
                  </span>
                </span>
                <span className="text-sm text-[var(--prose-2)]">
                  {bestMe.number.toLocaleString()} ·{' '}
                  {bestMe.totalEP.toLocaleString()} EP
                </span>
              </div>
            </div>
          )}

          {session?.user &&
            !loading &&
            ((metric === 'total' && !me) || (metric === 'best' && !bestMe)) && (
              <p className="text-sm text-[var(--prose-2)]">
                {view === 'ranked'
                  ? 'Claim @username and generate Ranked free-play rolls to place here.'
                  : metric === 'best'
                    ? 'Set a public @username and make a public Free play roll to appear.'
                    : 'Set a public @username and sync free-play progress to appear on Practice.'}
              </p>
            )}

          {loading && <p className="text-sm text-[var(--prose-2)]">Loading…</p>}
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}

          {metric === 'total' && (
            <ol className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
              {entries.map((e) => {
                const isMe =
                  (myUsername &&
                    e.username &&
                    e.username.toLowerCase() === myUsername.toLowerCase()) ||
                  (me?.username &&
                    e.username &&
                    e.username.toLowerCase() === me.username.toLowerCase());
                const uname = e.username?.toLowerCase() ?? '';
                const isFollowing = uname ? following.has(uname) : false;
                return (
                  <li
                    key={`${e.rank}-${e.username}`}
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                      isMe
                        ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-[var(--accent)]'
                        : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="mono-number w-8 text-[var(--prose-2)]">
                        #{e.rank}
                      </span>
                      <button
                        type="button"
                        className="truncate text-left font-bold hover:underline"
                        onClick={() => e.username && onOpenProfile(e.username)}
                        disabled={!e.username}
                      >
                        {e.username ? `@${e.username}` : e.name}
                        {isMe && (
                          <span className="ml-2 text-xs font-bold text-[var(--accent)]">
                            you
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm text-[var(--prose-2)]">
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {e.lifetimeEP.toLocaleString()} EP
                        </span>
                        {' · '}
                        {e.lifetimeRollCount.toLocaleString()} rolls
                      </div>
                      {session?.user && e.username && !isMe && (
                        <button
                          type="button"
                          title={isFollowing ? 'Unfollow' : 'Follow'}
                          disabled={followBusy === uname}
                          onClick={() => void toggleFollow(e.username!)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold leading-none ${
                            isFollowing
                              ? 'border-[var(--outline)] text-[var(--prose-2)]'
                              : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                          }`}
                        >
                          {isFollowing ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {metric === 'best' && (
            <ol className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
              {bestEntries.map((e) => {
                const isMe =
                  (myUsername &&
                    e.username &&
                    e.username.toLowerCase() === myUsername.toLowerCase()) ||
                  (bestMe?.username &&
                    e.username &&
                    e.username.toLowerCase() === bestMe.username.toLowerCase());
                const uname = e.username?.toLowerCase() ?? '';
                const isFollowing = uname ? following.has(uname) : false;
                return (
                  <li
                    key={`best-${e.rank}-${e.username}`}
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                      isMe
                        ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-[var(--accent)]'
                        : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="mono-number w-8 text-[var(--prose-2)]">
                        #{e.rank}
                      </span>
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="truncate text-left font-bold hover:underline"
                          onClick={() =>
                            e.username && onOpenProfile(e.username)
                          }
                          disabled={!e.username}
                        >
                          {e.username ? `@${e.username}` : e.name}
                          {isMe && (
                            <span className="ml-2 text-xs font-bold text-[var(--accent)]">
                              you
                            </span>
                          )}
                        </button>
                        <div className="mono-number text-lg font-bold">
                          {e.number.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-[var(--prose-3)]">
                          {formatDateTime(e.rolledAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right text-sm text-[var(--prose-2)]">
                        <RarityBadge rarity={coerceRarity(e.rarity)} />
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          {e.totalEP.toLocaleString()} EP
                        </div>
                      </div>
                      {session?.user && e.username && !isMe && (
                        <button
                          type="button"
                          title={isFollowing ? 'Unfollow' : 'Follow'}
                          disabled={followBusy === uname}
                          onClick={() => void toggleFollow(e.username!)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg font-bold leading-none ${
                            isFollowing
                              ? 'border-[var(--outline)] text-[var(--prose-2)]'
                              : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                          }`}
                        >
                          {isFollowing ? '✓' : '+'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
