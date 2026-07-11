import { useEffect, useMemo, useRef, useState } from 'react';
import type { RollResult } from '../../game';
import { useGameSettings } from '../../state/GameProvider';
import { RarityBadge } from './RarityBadge';
import { laneFromSource, RelativeTime, type RollLaneKind } from './RollRow';

type Lane = RollLaneKind;

const TABS: { id: Lane; label: string }[] = [
  { id: 'free', label: 'Free play' },
  { id: 'ranked', label: 'Ranked' },
  { id: 'challenge', label: 'Challenge' },
];

const EXIT_MS = 380;

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-2.2 3.2" />
      <path d="M6.1 6.1A17.5 17.5 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.2-.8" />
    </svg>
  );
}

function rollLane(r: RollResult): Lane {
  if (r.source === 'challenge' || r.challengeKey) return 'challenge';
  return laneFromSource(r.source);
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
  const { settings, setLatestRunsSpoilersHidden } = useGameSettings();
  const spoilersHidden = settings.latestRunsSpoilersHidden === true;
  const [lane, setLane] = useState<Lane>(defaultLane);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());
  const [exiting, setExiting] = useState<RollResult[]>([]);
  const prevIdsRef = useRef<string[]>([]);
  const prevLaneRef = useRef<Lane>(defaultLane);
  const byIdRef = useRef<Map<string, RollResult>>(new Map());

  const spoilerClass = spoilersHidden
    ? 'select-none blur-[6px] transition-[filter] duration-200'
    : 'transition-[filter] duration-200';

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
    <aside className="flex h-full max-h-full w-full flex-col overflow-hidden rounded-xl border border-(--outline) bg-(--bg)/95 text-left shadow-lg backdrop-blur-md supports-backdrop-filter:bg-(--surface)/90">
      <div className="shrink-0 border-b border-(--outline) px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-(--prose-3)">
              Latest runs
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-(--prose-3)">
              Top 10 · Free / Ranked / Challenge
            </p>
          </div>
          <button
            type="button"
            aria-pressed={spoilersHidden}
            aria-label={
              spoilersHidden ? 'Show run results' : 'Hide run results'
            }
            title={spoilersHidden ? 'Show run results' : 'Hide run results'}
            onClick={() => setLatestRunsSpoilersHidden(!spoilersHidden)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-(--prose-3) transition hover:bg-(--surface-raised) hover:text-(--prose)"
          >
            {spoilersHidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Latest runs mode"
        className="flex shrink-0 flex-wrap gap-1 border-b border-(--outline) p-2"
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
                    : 'bg-(--prose) text-(--bg)'
                  : 'text-(--prose-2) hover:bg-(--surface-raised)'
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
          <li className="px-3 py-8 text-center text-xs text-(--prose-3)">
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
                        ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] ring-1 ring-inset ring-(--accent)'
                        : clickable
                          ? 'hover:bg-(--surface-raised)'
                          : ''
                    }`}
                  >
                    <span className="mono-number mt-0.5 w-4 shrink-0 text-[10px] font-bold text-(--prose-3)">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`mono-number text-base font-bold tracking-tight text-(--prose) ${spoilerClass}`}
                      >
                        {r.number.toLocaleString()}
                      </div>
                      <div
                        className={`mt-1 flex flex-wrap items-center gap-1.5 ${spoilerClass}`}
                      >
                        <RarityBadge rarity={r.rarity} />
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          {r.totalEP.toLocaleString()} EP
                        </span>
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-(--prose-3)">
                        <RelativeTime
                          iso={r.rolledAt}
                          className="text-[10px] text-(--prose-3)"
                        />
                        <span className={spoilerClass}>
                          · {r.badges.length} badge
                          {r.badges.length === 1 ? '' : 's'}
                        </span>
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
                  <span className="mono-number mt-0.5 w-4 shrink-0 text-[10px] font-bold text-(--prose-3)">
                    —
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`mono-number text-base font-bold tracking-tight text-(--prose) ${spoilerClass}`}
                    >
                      {r.number.toLocaleString()}
                    </div>
                    <div
                      className={`mt-1 flex flex-wrap items-center gap-1.5 ${spoilerClass}`}
                    >
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
