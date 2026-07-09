import { useEffect, useState } from 'react';
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

export function LeaderboardScreen({
  onOpenProfile,
}: {
  onOpenProfile: (username: string) => void;
}) {
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const [sort, setSort] = useState<'ep' | 'rolls' | 'badges'>('ep');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ period, sort, limit: '50' });
    const url = `/api/leaderboard?${q}`;
    log.info('fetch:start', { period, sort });

    withTimeout(
      fetch(url, { signal: ac.signal }),
      15_000,
      'leaderboard fetch',
    )
      .then(async (r) => {
        const data = (await r.json()) as {
          error?: string;
          entries?: Entry[];
        };
        log.info('fetch:response', {
          status: r.status,
          count: data.entries?.length ?? 0,
        });
        if (!r.ok) throw new Error(data.error ?? 'Failed to load');
        if (!cancelled) setEntries(data.entries ?? []);
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
  }, [period, sort]);

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
            <Toggle active={sort === 'ep'} onClick={() => setSort('ep')} label="EP" />
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
        {entries.map((e) => (
          <li
            key={`${e.rank}-${e.username}`}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
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
        ))}
      </ol>
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
