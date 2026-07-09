import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  fetchFeed,
  fetchLeaderboard,
  type FeedSource,
} from '../../lib/leaderboard-api';
import {
  fetchFollowingUsernames,
  followUser,
  unfollowUser,
} from '../../lib/notifications-api';
import { FindPlayers } from '../components/FindPlayers';
import { SegmentedToggle } from '../components/SegmentedToggle';

type BoardView = 'board' | 'feed' | 'find';

export function LeaderboardScreen({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void;
}) {
  const { data: session } = useSession();
  const myUsername = session?.user.username ?? null;

  const [view, setView] = useState<BoardView>('board');
  /** Ranked = server free play · Practice = synced free-play / overall progress */
  const [scope, setScope] = useState<'ranked' | 'practice'>('ranked');
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const [sort, setSort] = useState<'ep' | 'rolls' | 'badges'>('ep');
  /** Feed lane: all · Ranked server · Free play / practice client */
  const [feedSource, setFeedSource] = useState<FeedSource>('all');
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setFollowing(new Set());
      return;
    }
    void fetchFollowingUsernames().then(setFollowing);
  }, [session?.user]);

  // Ranked board only supports ep/rolls
  const effectiveSort = scope === 'ranked' && sort === 'badges' ? 'ep' : sort;
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
    enabled: view === 'board',
  });
  const entries = boardQuery.data?.entries ?? [];
  const me = boardQuery.data?.me ?? null;
  const loading = view === 'board' && boardQuery.isPending;
  const error = boardQuery.error
    ? boardQuery.error instanceof Error
      ? boardQuery.error.message
      : 'Failed'
    : null;

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
      : // Soft tip (e.g. only showing self) — keep as non-blocking note
        (feedQuery.data?.message ?? null);

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
    me &&
    entries.some(
      (e) =>
        e.username &&
        me.username &&
        e.username.toLowerCase() === me.username.toLowerCase(),
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-[var(--prose-2)]">
          Two boards: <strong className="text-[var(--prose)]">Ranked</strong>{' '}
          (from Roll → Ranked — server free play, fair competition) and{' '}
          <strong className="text-[var(--prose)]">Practice</strong> (from Roll →
          Free play sync — overall progress, social honor system). Feed and Find
          are separate.
        </p>
      </div>

      <SegmentedToggle
        options={[
          { id: 'board', label: 'Board' },
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
              players from Board / Find.
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

      {view === 'board' && (
        <>
          <SegmentedToggle
            options={[
              { id: 'ranked', label: 'Ranked' },
              { id: 'practice', label: 'Practice' },
            ]}
            value={scope}
            onChange={(next) => {
              setScope(next);
              if (next === 'ranked' && sort === 'badges') setSort('ep');
            }}
          />
          <p className="text-xs leading-snug text-[var(--prose-3)]">
            {scope === 'ranked'
              ? 'Only rolls from Roll → Ranked (server CSPRNG). Sign-in + @username required. Crowns use this board too.'
              : 'Synced Free play progress (all-time) and public practice rolls this week. Social — not anti-cheat competitive.'}
          </p>

          <div className="flex flex-wrap gap-2">
            <SegmentedToggle
              className="contents"
              options={[
                { id: 'all', label: 'All-time' },
                { id: 'week', label: 'This week' },
              ]}
              value={period}
              onChange={setPeriod}
            />
            {period === 'all' && (
              <SegmentedToggle
                className="contents"
                options={[
                  { id: 'ep', label: 'EP' },
                  { id: 'rolls', label: 'Rolls' },
                  ...(scope === 'practice'
                    ? [{ id: 'badges' as const, label: 'Badges' }]
                    : []),
                ]}
                value={sort}
                onChange={setSort}
              />
            )}
          </div>

          {me && (
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
          {session?.user && !me && !loading && (
            <p className="text-sm text-[var(--prose-2)]">
              {scope === 'ranked'
                ? 'Claim @username and generate Ranked free-play rolls to place here.'
                : 'Set a public @username and sync free-play progress to appear on Practice.'}
            </p>
          )}

          {loading && <p className="text-sm text-[var(--prose-2)]">Loading…</p>}
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}

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
        </>
      )}
    </div>
  );
}
