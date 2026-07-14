import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { coerceRarity } from '../../game';
import { fetchArcadeLeaderboard } from '../../lib/arcade-api';
import { useSession } from '../../lib/auth-client';
import {
  fetchBestRollLeaderboard,
  fetchFeed,
  fetchLeaderboard,
  type BestRollSortBy,
  type FeedSource,
  type LeaderboardSort,
} from '../../lib/leaderboard-api';
import {
  FOLLOWING_LIST_QUERY_KEY,
  FOLLOWING_USERNAMES_QUERY_KEY,
  fetchFollowingUsernames,
  followUser,
  unfollowUser,
} from '../../lib/notifications-api';
import { FindPlayers } from '../components/FindPlayers';
import { FormattedCount } from '../components/FormattedCount';
import { QueryErrorBanner } from '../components/QueryErrorBanner';
import { RarityBadge } from '../components/RarityBadge';
import {
  laneFromSource,
  RelativeTime,
  RollMetaLine,
} from '../components/RollRow';
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
  const queryClient = useQueryClient();
  const myUsername = session?.user.username ?? null;

  const [view, setView] = useState<BoardView>('ranked');
  const [metricKey, setMetricKey] = useState<BoardMetricKey>('total-ep');
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const [circle, setCircle] = useState<'global' | 'friends'>('global');
  const [feedSource, setFeedSource] = useState<FeedSource>('all');
  const [followBusy, setFollowBusy] = useState<string | null>(null);
  const friendsOnly = circle === 'friends';
  const followingQuery = useQuery({
    queryKey: FOLLOWING_USERNAMES_QUERY_KEY,
    queryFn: fetchFollowingUsernames,
    enabled: Boolean(session?.user),
    staleTime: 60_000,
  });
  const following = followingQuery.data ?? new Set<string>();

  const { metric, sort, sortBy } = metricToState(metricKey);
  const scope = view === 'practice' ? 'practice' : 'ranked';
  const onEpBoard = view === 'ranked' || view === 'practice';

  // Ranked has no badges sort — coerce if needed
  const effectiveSort: LeaderboardSort =
    scope === 'ranked' && sort === 'badges' ? 'ep' : sort;
  const effectiveMetricKey: BoardMetricKey =
    scope === 'ranked' && metricKey === 'total-badges' ? 'total-ep' : metricKey;

  useEffect(() => {
    if (
      metricKey === 'total-badges' &&
      (scope === 'ranked' || period !== 'all')
    ) {
      setMetricKey('total-ep');
    }
  }, [metricKey, scope, period]);

  const boardQuery = useQuery({
    queryKey: ['leaderboard', scope, period, effectiveSort, friendsOnly],
    queryFn: ({ signal }) =>
      fetchLeaderboard({
        scope,
        period,
        sort: effectiveSort,
        limit: 50,
        friendsOnly,
        signal,
      }),
    enabled:
      onEpBoard &&
      metric === 'total' &&
      (!friendsOnly || Boolean(session?.user)),
  });
  const bestQuery = useQuery({
    queryKey: ['leaderboard-best', scope, period, sortBy, friendsOnly],
    queryFn: ({ signal }) =>
      fetchBestRollLeaderboard({
        scope,
        period,
        sortBy,
        limit: 50,
        friendsOnly,
        signal,
      }),
    enabled:
      onEpBoard &&
      metric === 'best' &&
      (!friendsOnly || Boolean(session?.user)),
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
  const boardMessage =
    metric === 'best' ? bestQuery.data?.message : boardQuery.data?.message;

  const activeQuery = metric === 'best' ? bestQuery : boardQuery;
  const friendsSignInGate = onEpBoard && friendsOnly && !session?.user;
  const loading =
    (onEpBoard && !friendsSignInGate && activeQuery.isPending) ||
    (view === 'arcade' && arcadeQuery.isPending);
  const error = (() => {
    if (friendsSignInGate) return null;
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
        queryClient.setQueryData(FOLLOWING_USERNAMES_QUERY_KEY, next);
      } else {
        await followUser(username);
        const next = new Set(following);
        next.add(key);
        queryClient.setQueryData(FOLLOWING_USERNAMES_QUERY_KEY, next);
      }
      void queryClient.invalidateQueries({
        queryKey: FOLLOWING_LIST_QUERY_KEY,
      });
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
        <p className="text-sm text-(--prose-2)">
          <strong className="text-(--prose)">Ranked</strong> (server free play)
          and <strong className="text-(--prose)">Practice</strong> (synced Free
          play) use EP. <strong className="text-(--prose)">Arcade</strong> ranks
          best Digits run — separate from EP. Feed and Find stay social.
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
          onFollowingChange={(next) =>
            queryClient.setQueryData(FOLLOWING_USERNAMES_QUERY_KEY, next)
          }
          onOpenProfile={onOpenProfile}
        />
      )}

      {view === 'feed' && (
        <div className="space-y-3">
          <p className="text-sm text-(--prose-2)">
            Public rolls from <strong className="text-(--prose)">you</strong>{' '}
            and people you follow (last 14 days). Use Find or + on the board to
            follow others.
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
          <p className="text-xs text-(--prose-3)">
            {feedSource === 'ranked'
              ? 'Server Ranked free-play rolls only.'
              : feedSource === 'practice'
                ? 'Client Free play + challenge rolls (not Ranked).'
                : 'Both Ranked and Free play public rolls.'}
          </p>
          {feedLoading && (
            <p className="text-sm text-(--prose-2)">Loading feed…</p>
          )}
          {feedError && (
            <QueryErrorBanner
              message={feedError}
              onRetry={() => void feedQuery.refetch()}
            />
          )}
          {!feedLoading && feed.length === 0 && !feedError && (
            <p className="text-sm text-(--prose-2)">
              No public rolls in this lane yet. Roll Free or Ranked, or follow
              players from Ranked / Practice / Find.
            </p>
          )}
          <ul className="divide-y divide-(--outline) border border-(--outline)">
            {feed.map((item) => {
              const isMe =
                item.isMe ||
                (myUsername &&
                  item.username &&
                  item.username.toLowerCase() === myUsername.toLowerCase());
              const lane = laneFromSource(item.source);
              return (
                <li
                  key={`${item.id}-${item.rolledAt}`}
                  className={`relative overflow-hidden px-3 py-3 ${
                    isMe
                      ? 'bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                      : 'hover:bg-(--surface-raised)'
                  }`}
                >
                  {lane === 'ranked' && (
                    <span
                      className="absolute inset-y-0 left-0 w-[3px] bg-amber-500"
                      aria-hidden
                    />
                  )}
                  <div className="pl-0.5">
                    <button
                      type="button"
                      className="font-bold hover:underline"
                      onClick={() =>
                        item.username && onOpenProfile(item.username)
                      }
                    >
                      @{item.username}
                      {isMe && (
                        <span className="ml-1.5 text-xs font-bold text-(--accent)">
                          you
                        </span>
                      )}
                    </button>
                    <div className="mono-number text-lg font-bold">
                      {item.number.toLocaleString()}
                    </div>
                    <RollMetaLine
                      lane={lane}
                      rarity={coerceRarity(item.rarity)}
                      totalEP={item.totalEP}
                      rolledAt={item.rolledAt}
                      attested={item.attested}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {view === 'arcade' && (
        <>
          <p className="text-xs leading-snug text-(--prose-3)">
            Best single Arcade run (Digits). Separate from EP — play from the
            Arcade tab.
          </p>

          {arcadeMe && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-(--accent) bg-(--surface-raised)'
                  : 'border-(--outline) bg-(--surface)'
              }`}
            >
              <span className="text-sm font-semibold text-(--prose-2)">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{arcadeMe.rank}{' '}
                  {arcadeMe.username ? `@${arcadeMe.username}` : arcadeMe.name}
                  <span className="ml-2 rounded bg-(--prose) px-1.5 py-0.5 text-xs text-(--bg)">
                    you
                  </span>
                </span>
                <span className="text-sm text-(--prose-2)">
                  <FormattedCount value={arcadeMe.bestRunScore} /> Digits ·{' '}
                  <FormattedCount value={arcadeMe.totalRunsCompleted} /> runs
                </span>
              </div>
            </div>
          )}

          {session?.user && !loading && !arcadeMe && (
            <p className="text-sm text-(--prose-2)">
              Claim @username and complete an Arcade run to place here.
            </p>
          )}

          {loading && <p className="text-sm text-(--prose-2)">Loading…</p>}
          {error && (
            <QueryErrorBanner
              message={error}
              onRetry={() => {
                if (view === 'arcade') void arcadeQuery.refetch();
                else void activeQuery.refetch();
              }}
            />
          )}

          {!loading && !error && arcadeEntries.length === 0 && (
            <div className="rounded-lg border border-dashed border-(--outline) px-4 py-6 text-center text-sm text-(--prose-2)">
              No Arcade runs on the board yet. Start a Digits run from the
              Arcade tab.
            </div>
          )}

          <ol className="divide-y divide-(--outline) border border-(--outline)">
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
                      ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-(--accent)'
                      : ''
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="mono-number w-8 text-(--prose-2)">
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
                        <span className="ml-2 text-xs font-bold text-(--accent)">
                          you
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm text-(--prose-2)">
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        <FormattedCount value={e.bestRunScore} /> Digits
                      </span>
                      {' · '}
                      <FormattedCount value={e.totalRunsCompleted} /> runs
                    </div>
                    {session?.user && e.username && !isMe && (
                      <button
                        type="button"
                        title={isFollowing ? 'Unfollow' : 'Follow'}
                        aria-label={
                          isFollowing
                            ? `Unfollow @${e.username}`
                            : `Follow @${e.username}`
                        }
                        disabled={followBusy === uname}
                        onClick={() => void toggleFollow(e.username!)}
                        className={`flex h-11 w-11 items-center justify-center rounded-md border text-lg font-bold leading-none ${
                          isFollowing
                            ? 'border-(--outline) text-(--prose-2)'
                            : 'border-(--accent) bg-(--accent) text-(--bg)'
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-(--prose-3)">
              Metric
            </label>
            <select
              className="w-full max-w-md rounded-md border border-(--outline) bg-(--surface) px-2.5 py-2 text-sm font-semibold"
              value={effectiveMetricKey}
              onChange={(e) => setMetricKey(e.target.value as BoardMetricKey)}
            >
              {metricOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs leading-snug text-(--prose-3)">
              {view === 'ranked'
                ? 'Only rolls from Roll → Ranked (server CSPRNG). Sign-in + @username required. Crowns use this board too.'
                : metric === 'best'
                  ? 'Public Free play + challenge rolls (not Ranked). One personal best per player.'
                  : 'Synced Free play progress (all-time) and public practice rolls this week. Social — not anti-cheat competitive.'}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-(--prose-3)">
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
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-(--prose-3)">
                Circle
              </span>
              <SegmentedToggle
                chipClassName="rounded-md border px-2 py-1 text-xs font-semibold"
                options={[
                  { id: 'global', label: 'Global' },
                  { id: 'friends', label: 'Friends' },
                ]}
                value={circle}
                onChange={setCircle}
              />
            </div>
          </div>

          {metric === 'total' && me && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-(--accent) bg-(--surface-raised)'
                  : 'border-(--outline) bg-(--surface)'
              }`}
            >
              <span className="text-sm font-semibold text-(--prose-2)">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{me.rank} {me.username ? `@${me.username}` : me.name}
                  <span className="ml-2 rounded bg-(--prose) px-1.5 py-0.5 text-xs text-(--bg)">
                    you
                  </span>
                </span>
                <span className="text-sm text-(--prose-2)">
                  <FormattedCount value={me.lifetimeEP} /> EP ·{' '}
                  <FormattedCount value={me.lifetimeRollCount} /> rolls
                </span>
              </div>
            </div>
          )}

          {metric === 'best' && bestMe && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-(--accent) bg-(--surface-raised)'
                  : 'border-(--outline) bg-(--surface)'
              }`}
            >
              <span className="text-sm font-semibold text-(--prose-2)">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{bestMe.rank}{' '}
                  {bestMe.username ? `@${bestMe.username}` : bestMe.name}
                  <span className="ml-2 rounded bg-(--prose) px-1.5 py-0.5 text-xs text-(--bg)">
                    you
                  </span>
                </span>
                <span className="text-sm text-(--prose-2)">
                  {bestMe.number.toLocaleString()} ·{' '}
                  <FormattedCount value={bestMe.totalEP} /> EP
                </span>
              </div>
            </div>
          )}

          {session?.user &&
            !loading &&
            ((metric === 'total' && !me) || (metric === 'best' && !bestMe)) && (
              <p className="text-sm text-(--prose-2)">
                {view === 'ranked'
                  ? 'Claim @username and generate Ranked free-play rolls to place here.'
                  : metric === 'best'
                    ? 'Set a public @username and make a public Free play roll to appear.'
                    : 'Set a public @username and sync free-play progress to appear on Practice.'}
              </p>
            )}

          {loading && <p className="text-sm text-(--prose-2)">Loading…</p>}
          {friendsSignInGate && (
            <p className="text-sm text-(--prose-2)">
              Sign in to filter the board to people you follow.
            </p>
          )}
          {error && !friendsSignInGate && (
            <QueryErrorBanner
              message={error}
              onRetry={() => void activeQuery.refetch()}
            />
          )}

          {!loading &&
            !error &&
            !friendsSignInGate &&
            boardMessage &&
            ((metric === 'total' && entries.length <= 1) ||
              (metric === 'best' && bestEntries.length <= 1)) && (
              <p className="text-sm text-(--prose-2)">{boardMessage}</p>
            )}

          {!loading &&
            !error &&
            !friendsSignInGate &&
            ((metric === 'total' && entries.length === 0) ||
              (metric === 'best' && bestEntries.length === 0)) && (
              <div className="rounded-lg border border-dashed border-(--outline) px-4 py-6 text-center text-sm text-(--prose-2)">
                {friendsOnly
                  ? 'No friends on this board yet. Follow players from Find or Friends, then check back.'
                  : view === 'ranked'
                    ? 'No Ranked rolls on the board yet. Sign in, claim @username, and Generate with Roll → Ranked.'
                    : 'No Practice entries yet. Sync Free play progress or make a public Free play roll.'}
              </div>
            )}

          {metric === 'total' && (
            <ol className="divide-y divide-(--outline) border border-(--outline)">
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
                        ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-(--accent)'
                        : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="mono-number w-8 text-(--prose-2)">
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
                          <span className="ml-2 text-xs font-bold text-(--accent)">
                            you
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm text-(--prose-2)">
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          <FormattedCount value={e.lifetimeEP} /> EP
                        </span>
                        {' · '}
                        <FormattedCount value={e.lifetimeRollCount} /> rolls
                      </div>
                      {session?.user && e.username && !isMe && (
                        <button
                          type="button"
                          title={isFollowing ? 'Unfollow' : 'Follow'}
                          aria-label={
                            isFollowing
                              ? `Unfollow @${e.username}`
                              : `Follow @${e.username}`
                          }
                          disabled={followBusy === uname}
                          onClick={() => void toggleFollow(e.username!)}
                          className={`flex h-11 w-11 items-center justify-center rounded-md border text-lg font-bold leading-none ${
                            isFollowing
                              ? 'border-(--outline) text-(--prose-2)'
                              : 'border-(--accent) bg-(--accent) text-(--bg)'
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
            <ol className="divide-y divide-(--outline) border border-(--outline)">
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
                        ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-(--accent)'
                        : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="mono-number w-8 text-(--prose-2)">
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
                            <span className="ml-2 text-xs font-bold text-(--accent)">
                              you
                            </span>
                          )}
                        </button>
                        <div className="mono-number text-lg font-bold">
                          {e.number.toLocaleString()}
                        </div>
                        <RelativeTime
                          iso={e.rolledAt}
                          className="text-[11px] text-(--prose-3)"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-right text-sm text-(--prose-2)">
                        <RarityBadge rarity={coerceRarity(e.rarity)} />
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          <FormattedCount value={e.totalEP} /> EP
                        </div>
                      </div>
                      {session?.user && e.username && !isMe && (
                        <button
                          type="button"
                          title={isFollowing ? 'Unfollow' : 'Follow'}
                          aria-label={
                            isFollowing
                              ? `Unfollow @${e.username}`
                              : `Follow @${e.username}`
                          }
                          disabled={followBusy === uname}
                          onClick={() => void toggleFollow(e.username!)}
                          className={`flex h-11 w-11 items-center justify-center rounded-md border text-lg font-bold leading-none ${
                            isFollowing
                              ? 'border-(--outline) text-(--prose-2)'
                              : 'border-(--accent) bg-(--accent) text-(--bg)'
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
