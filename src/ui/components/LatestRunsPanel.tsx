import { useMemo, useState } from 'react';
import type { RollResult } from '../../game';
import { RarityBadge } from './RarityBadge';

type Lane = 'free' | 'ranked' | 'challenge';

const TABS: { id: Lane; label: string }[] = [
  { id: 'free', label: 'Free play' },
  { id: 'ranked', label: 'Ranked' },
  { id: 'challenge', label: 'Challenge' },
];

function rollLane(r: RollResult): Lane {
  if (r.source === 'ranked') return 'ranked';
  if (r.source === 'challenge' || r.challengeKey) return 'challenge';
  return 'free';
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Compact sidebar of the 10 most recent rolls for a mode lane.
 */
export function LatestRunsPanel({
  history,
  activeRollId,
  onSelect,
  defaultLane = 'free',
}: {
  history: RollResult[];
  /** Highlight the roll currently on the main reel */
  activeRollId?: string | null;
  onSelect?: (roll: RollResult) => void;
  defaultLane?: Lane;
}) {
  const [lane, setLane] = useState<Lane>(defaultLane);

  const counts = useMemo(() => {
    const c = { free: 0, ranked: 0, challenge: 0 };
    for (const r of history) c[rollLane(r)] += 1;
    return c;
  }, [history]);

  const latest = useMemo(() => {
    return history
      .filter((r) => rollLane(r) === lane)
      .slice()
      .sort((a, b) => (a.rolledAt < b.rolledAt ? 1 : -1))
      .slice(0, 10);
  }, [history, lane]);

  return (
    <aside className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--outline)] bg-[var(--bg)]/95 text-left shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/90">
      <div className="shrink-0 border-b border-[var(--outline)] px-3 py-2.5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--prose-3)]">
          Latest runs
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--prose-3)]">
          Top 10 · Free / Ranked / Challenge
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Latest runs mode"
        className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--outline)] p-2"
      >
        {TABS.map((t) => {
          const selected = lane === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setLane(t.id)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-semibold sm:text-xs ${
                selected
                  ? t.id === 'ranked'
                    ? 'bg-amber-500 text-black'
                    : 'bg-[var(--prose)] text-[var(--bg)]'
                  : 'text-[var(--prose-2)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-75">({counts[t.id]})</span>
            </button>
          );
        })}
      </div>

      <ol className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain p-1">
        {latest.length === 0 ? (
          <li className="px-3 py-8 text-center text-xs text-[var(--prose-3)]">
            No {TABS.find((t) => t.id === lane)?.label ?? ''} runs yet.
          </li>
        ) : (
          latest.map((r, i) => {
            const active = activeRollId === r.id;
            const clickable = Boolean(onSelect);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => onSelect?.(r)}
                  className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition ${
                    active
                      ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] ring-1 ring-inset ring-[var(--accent)]'
                      : clickable
                        ? 'hover:bg-[var(--surface-raised)]'
                        : ''
                  }`}
                >
                  <span className="mono-number mt-0.5 w-4 shrink-0 text-[10px] font-bold text-[var(--prose-3)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mono-number text-base font-bold tracking-tight text-[var(--prose)]">
                      {r.number.toLocaleString()}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <RarityBadge rarity={r.rarity} />
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        {r.totalEP.toLocaleString()} EP
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--prose-3)]">
                      {fmtWhen(r.rolledAt)}
                      {' · '}
                      {r.badges.length} badge{r.badges.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ol>
    </aside>
  );
}
