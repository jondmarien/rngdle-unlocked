import { useEffect, useMemo, useRef, useState } from 'react';
import type { RollResult } from '../../game';
import { formatDateTimeCompact } from '../../lib/format';
import { RarityBadge } from './RarityBadge';

type Lane = 'free' | 'ranked' | 'challenge';

const TABS: { id: Lane; label: string }[] = [
  { id: 'free', label: 'Free play' },
  { id: 'ranked', label: 'Ranked' },
  { id: 'challenge', label: 'Challenge' },
];

const EXIT_MS = 380;

function rollLane(r: RollResult): Lane {
  if (r.source === 'ranked') return 'ranked';
  if (r.source === 'challenge' || r.challengeKey) return 'challenge';
  return 'free';
}

/**
 * Compact sidebar of the 10 most recent rolls for a mode lane.
 * New runs slide in at the top; rows pushed off #10 fade out at the bottom.
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
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());
  const [exiting, setExiting] = useState<RollResult[]>([]);
  const prevIdsRef = useRef<string[]>([]);
  const prevLaneRef = useRef<Lane>(defaultLane);
  const byIdRef = useRef<Map<string, RollResult>>(new Map());

  useEffect(() => {
    setLane(defaultLane);
  }, [defaultLane]);

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

  useEffect(() => {
    for (const r of history) byIdRef.current.set(r.id, r);
  }, [history]);

  useEffect(() => {
    const nextIds = latest.map((r) => r.id);
    const laneChanged = prevLaneRef.current !== lane;
    prevLaneRef.current = lane;

    if (laneChanged) {
      prevIdsRef.current = nextIds;
      setEnteringIds(new Set());
      setExiting([]);
      return;
    }

    const prevIds = prevIdsRef.current;
    if (prevIds.length === 0) {
      prevIdsRef.current = nextIds;
      return;
    }

    const prevSet = new Set(prevIds);
    const nextSet = new Set(nextIds);
    const entered = nextIds.filter((id) => !prevSet.has(id));
    const left = prevIds.filter((id) => !nextSet.has(id));
    prevIdsRef.current = nextIds;

    const timers: number[] = [];

    if (entered.length > 0) {
      setEnteringIds(new Set(entered));
      timers.push(
        window.setTimeout(() => {
          setEnteringIds(new Set());
        }, EXIT_MS),
      );
    }

    if (left.length > 0) {
      const leavingRolls = left
        .map((id) => byIdRef.current.get(id))
        .filter((r): r is RollResult => Boolean(r));
      if (leavingRolls.length > 0) {
        setExiting(leavingRolls);
        timers.push(window.setTimeout(() => setExiting([]), EXIT_MS));
      }
    }

    if (timers.length === 0) return;
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [latest, lane]);

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

      <ol className="latest-runs-list min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain p-1">
        {latest.length === 0 && exiting.length === 0 ? (
          <li className="px-3 py-8 text-center text-xs text-[var(--prose-3)]">
            No {TABS.find((t) => t.id === lane)?.label ?? ''} runs yet.
          </li>
        ) : (
          <>
            {latest.map((r, i) => {
              const active = activeRollId === r.id;
              const clickable = Boolean(onSelect);
              const entering = enteringIds.has(r.id);
              return (
                <li
                  key={r.id}
                  className={`latest-runs-item${entering ? ' latest-runs-item-enter' : ''}`}
                >
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
                        {formatDateTimeCompact(r.rolledAt)}
                        {' · '}
                        {r.badges.length} badge
                        {r.badges.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {exiting.map((r) => (
              <li
                key={`exit-${r.id}`}
                className="latest-runs-item latest-runs-item-exit"
                aria-hidden
              >
                <div className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left opacity-70">
                  <span className="mono-number mt-0.5 w-4 shrink-0 text-[10px] font-bold text-[var(--prose-3)]">
                    —
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
                  </div>
                </div>
              </li>
            ))}
          </>
        )}
      </ol>
    </aside>
  );
}
