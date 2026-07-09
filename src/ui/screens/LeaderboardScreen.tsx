import { useEffect, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import { createLogger, withTimeout } from '../../lib/logger';

const log = createLogger('leaderboard');

type Entry = {
  rank: number;
  username: string | null;
  name: string;
  lifetimeEP: number;
  lifetimeRollCount: number;
  badgeCount: number | null;
};

type FeedItem = {
  id: string;
  shortCode?: string | null;
  number: number;
  totalEP: number;
  rarity: string;
  rolledAt: string;
  username: string | null;
  name: string;
  attested?: boolean;
};

type BoardView = 'board' | 'feed';

export function LeaderboardScreen({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void;
}) {
  const { data: session } = useSession();
  const myUsername =
    (session?.user as { username?: string | null } | undefined)?.username ??
    null;

  const [view, setView] = useState<BoardView>('board');
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const [sort, setSort] = useState<'ep' | 'rolls' | 'badges'>('ep');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [me, setMe] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);

  useEffect(() => {
    if (view !== 'board') return;
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ period, sort, limit: '50' });
    const url = `/api/leaderboard?${q}`;
    log.info('fetch:start', { period, sort });

    withTimeout(
      fetch(url, { signal: ac.signal, credentials: 'include' }),
      15_000,
      'leaderboard fetch',
    )
      .then(async (r) => {
        const data = (await r.json()) as {
          error?: string;
          entries?: Entry[];
          me?: Entry | null;
        };
        log.info('fetch:response', {
          status: r.status,
          count: data.entries?.length ?? 0,
          meRank: data.me?.rank,
        });
        if (!r.ok) throw new Error(data.error ?? 'Failed to load');
        if (!cancelled) {
          setEntries(data.entries ?? []);
          setMe(data.me ?? null);
        }
      })
      .catch((e) => {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) {
          return;
        }
        log.error('fetch:fail', {
          err: e instanceof Error ? e.message : String(e),
        });
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [period, sort, view]);

  useEffect(() => {
    if (view !== 'feed') return;
    if (!session?.user) {
      setFeed([]);
      setFeedError('Sign in to see friends’ rare rolls.');
      return;
    }
    let cancelled = false;
    setFeedLoading(true);
    setFeedError(null);
    fetch('/api/feed', { credentials: 'include' })
      .then(async (r) => {
        const data = (await r.json()) as {
          error?: string;
          items?: FeedItem[];
          message?: string;
        };
        if (!r.ok) throw new Error(data.error ?? 'Feed failed');
        if (!cancelled) {
          setFeed(data.items ?? []);
          if (data.message && !(data.items?.length)) {
            setFeedError(data.message);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setFeedError(e instanceof Error ? e.message : 'Failed');
        }
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, session?.user]);

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
        <h1 className="text-xl font-bold uppercase tracking-wider">
          Leaderboard
        </h1>
        <p className="text-xs text-[var(--prose-3)]">
          Players with a public username who synced to the cloud.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
        <Toggle
          active={view === 'board'}
          onClick={() => setView('board')}
          label="Board"
        />
        <Toggle
          active={view === 'feed'}
          onClick={() => setView('feed')}
          label="Feed"
        />
      </div>

      {view === 'feed' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--prose-3)]">
            Rare+ public rolls from people you follow (last 14 days).
          </p>
          {feedLoading && (
            <p className="text-sm text-[var(--prose-3)]">Loading feed…</p>
          )}
          {feedError && (
            <p className="text-sm text-[var(--prose-3)]">{feedError}</p>
          )}
          {!feedLoading && !feedError && feed.length === 0 && (
            <p className="text-sm text-[var(--prose-3)]">
              No rare rolls yet — follow players from their profile.
            </p>
          )}
          <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
            {feed.map((item) => (
              <li
                key={`${item.id}-${item.rolledAt}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
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
                  </button>
                  <div className="mono-number text-lg font-bold">
                    {item.number.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-[var(--prose-3)]">
                  <span className="font-semibold uppercase text-amber-600 dark:text-amber-400">
                    {item.rarity}
                  </span>
                  {' · '}
                  {item.totalEP.toLocaleString()} EP
                  {item.attested ? ' · ✓ sealed' : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === 'board' && (
        <>
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
            <Toggle
              active={period === 'all'}
              onClick={() => setPeriod('all')}
              label="All-time"
            />
            <Toggle
              active={period === 'week'}
              onClick={() => setPeriod('week')}
              label="This week"
            />
            {period === 'all' && (
              <>
                <Toggle
                  active={sort === 'ep'}
                  onClick={() => setSort('ep')}
                  label="EP"
                />
                <Toggle
                  active={sort === 'rolls'}
                  onClick={() => setSort('rolls')}
                  label="Rolls"
                />
                <Toggle
                  active={sort === 'badges'}
                  onClick={() => setSort('badges')}
                  label="Badges"
                />
              </>
            )}
          </div>

          {/* Feature 1 — you on the board */}
          {me && (
            <div
              className={`rounded-lg border-2 px-3 py-2 text-sm ${
                meOnPage
                  ? 'border-[var(--accent)] bg-[var(--surface-raised)]'
                  : 'border-[var(--outline)] bg-[var(--surface)]'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
                You on the board
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">
                  #{me.rank}{' '}
                  {me.username ? `@${me.username}` : me.name}
                  <span className="ml-2 rounded bg-[var(--prose)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--bg)]">
                    you
                  </span>
                </span>
                <span className="text-xs text-[var(--prose-3)]">
                  {me.lifetimeEP.toLocaleString()} EP ·{' '}
                  {me.lifetimeRollCount.toLocaleString()} rolls
                </span>
              </div>
              {!meOnPage && (
                <p className="mt-1 text-[10px] text-[var(--prose-3)]">
                  Outside the top {entries.length} — keep rolling.
                </p>
              )}
            </div>
          )}
          {session?.user && !me && !loading && (
            <p className="text-xs text-[var(--prose-3)]">
              Set a public @username and push to cloud to appear on the board.
            </p>
          )}

          {loading && (
            <p className="text-sm text-[var(--prose-3)]">Loading…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-[var(--prose-3)]">
              No ranked players yet — set a username and push to cloud.
            </p>
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
              return (
                <li
                  key={`${e.rank}-${e.username}`}
                  className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${
                    isMe
                      ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] ring-1 ring-inset ring-[var(--accent)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="mono-number w-8 text-[var(--prose-3)]">
                      #{e.rank}
                    </span>
                    <button
                      type="button"
                      className="text-left font-bold hover:underline"
                      onClick={() => e.username && onOpenProfile(e.username)}
                      disabled={!e.username}
                    >
                      {e.username ? `@${e.username}` : e.name}
                      {isMe && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-[var(--accent)]">
                          you
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-[var(--prose-3)]">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {e.lifetimeEP.toLocaleString()} EP
                    </span>
                    {' · '}
                    {e.lifetimeRollCount.toLocaleString()} rolls
                    {e.badgeCount != null && ` · ${e.badgeCount} badges`}
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

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 ${
        active
          ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
          : 'border-[var(--outline)] text-[var(--prose-3)]'
      }`}
    >
      {label}
    </button>
  );
}
