import { useMemo, useState } from 'react';
import {
  topPercentFromEP,
  type RarityTier,
  type RollResult,
} from '../../game';
import { useGame } from '../../state/GameProvider';
import { BadgePill } from '../components/BadgePill';
import { BestRollCard } from '../components/BestRollCard';
import { RollReplayModal } from '../components/RollReplayModal';
import { RarityBadge } from '../components/RarityBadge';
import { SharePanel } from '../components/ShareCard';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const RARITY_RANK: Record<RarityTier, number> = {
  trash: 0,
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  anomaly: 5,
  mythic: 6,
};

type HistorySort =
  | 'newest'
  | 'oldest'
  | 'best_ep'
  | 'worst_ep'
  | 'rarest'
  | 'commonest'
  | 'most_badges'
  | 'fewest_badges'
  | 'highest_number'
  | 'lowest_number';

const SORT_OPTIONS: { id: HistorySort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'best_ep', label: 'Best EP' },
  { id: 'worst_ep', label: 'Worst EP' },
  { id: 'rarest', label: 'Rarest' },
  { id: 'commonest', label: 'Commonest' },
  { id: 'most_badges', label: 'Most badges' },
  { id: 'fewest_badges', label: 'Fewest badges' },
  { id: 'highest_number', label: 'Highest #' },
  { id: 'lowest_number', label: 'Lowest #' },
];

type HistoryLane = 'all' | 'free' | 'ranked' | 'challenge';

const LANE_OPTIONS: { id: HistoryLane; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free play' },
  { id: 'ranked', label: 'Ranked' },
  { id: 'challenge', label: 'Challenge' },
];

/** Normalize older history rows that predate `source`. */
function rollLane(r: RollResult): 'free' | 'ranked' | 'challenge' {
  if (r.source === 'ranked') return 'ranked';
  if (r.source === 'challenge' || r.challengeKey) return 'challenge';
  return 'free';
}

function filterByLane(list: RollResult[], lane: HistoryLane): RollResult[] {
  if (lane === 'all') return list;
  return list.filter((r) => rollLane(r) === lane);
}

function sortHistory(list: RollResult[], sort: HistorySort): RollResult[] {
  const copy = [...list];
  const byTime = (a: RollResult, b: RollResult) =>
    a.rolledAt < b.rolledAt ? 1 : a.rolledAt > b.rolledAt ? -1 : 0;

  switch (sort) {
    case 'newest':
      return copy.sort(byTime);
    case 'oldest':
      return copy.sort((a, b) => -byTime(a, b));
    case 'best_ep':
      return copy.sort(
        (a, b) => b.totalEP - a.totalEP || byTime(a, b),
      );
    case 'worst_ep':
      return copy.sort(
        (a, b) => a.totalEP - b.totalEP || byTime(a, b),
      );
    case 'rarest':
      return copy.sort(
        (a, b) =>
          RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] ||
          b.totalEP - a.totalEP,
      );
    case 'commonest':
      return copy.sort(
        (a, b) =>
          RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity] ||
          a.totalEP - b.totalEP,
      );
    case 'most_badges':
      return copy.sort(
        (a, b) => b.badges.length - a.badges.length || b.totalEP - a.totalEP,
      );
    case 'fewest_badges':
      return copy.sort(
        (a, b) => a.badges.length - b.badges.length || a.totalEP - b.totalEP,
      );
    case 'highest_number':
      return copy.sort((a, b) => b.number - a.number || byTime(a, b));
    case 'lowest_number':
      return copy.sort((a, b) => a.number - b.number || byTime(a, b));
    default:
      return copy;
  }
}

export function HistoryScreen({
  onGoAccount,
}: {
  onGoAccount?: () => void;
} = {}) {
  const { history, lifetimeRollCount, settings, stats } = useGame();
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);
  const [sort, setSort] = useState<HistorySort>('newest');
  const [lane, setLane] = useState<HistoryLane>('all');

  const best = stats.bestRoll;
  const bestFull = useMemo(() => {
    if (!best) return null;
    return history.find((r) => r.id === best.id) ?? null;
  }, [history, best]);

  const filtered = useMemo(
    () => filterByLane(history, lane),
    [history, lane],
  );

  const sorted = useMemo(
    () => sortHistory(filtered, sort),
    [filtered, sort],
  );

  const laneCounts = useMemo(() => {
    let free = 0;
    let ranked = 0;
    let challenge = 0;
    for (const r of history) {
      const l = rollLane(r);
      if (l === 'ranked') ranked += 1;
      else if (l === 'challenge') challenge += 1;
      else free += 1;
    }
    return { free, ranked, challenge, all: history.length };
  }, [history]);

  if (history.length === 0) {
    return (
      <p className="text-center text-[var(--prose-3)]">
        No rolls yet. Hit Generate on the Roll tab.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">History</h1>
        <p className="text-xs text-[var(--prose-3)]">
          Last {history.length} rolls (cap 500). Lifetime count never shrinks.
          Filter by Free play (client) or Ranked (server).
        </p>
      </div>

      {best && (
        <BestRollCard
          best={best}
          fullRoll={bestFull}
          onReplay={
            bestFull ? () => setReplayRoll(bestFull) : undefined
          }
          onShare={bestFull ? () => setShareRoll(bestFull) : undefined}
        />
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
            {lane === 'all'
              ? 'All rolls'
              : lane === 'free'
                ? 'Free play'
                : lane === 'ranked'
                  ? 'Ranked'
                  : 'Challenge'}
            <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--prose-3)]">
              ({sorted.length}
              {lane !== 'all' ? ` of ${history.length}` : ''})
            </span>
          </h2>
          <label className="flex items-center gap-2 text-xs text-[var(--prose-2)]">
            <span className="font-semibold uppercase tracking-wide">
              Sort by
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as HistorySort)}
              className="rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2 py-1.5 text-sm font-semibold text-[var(--prose)]"
              aria-label="Sort history"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {LANE_OPTIONS.map((o) => {
            const selected = lane === o.id;
            const count =
              o.id === 'all'
                ? laneCounts.all
                : o.id === 'free'
                  ? laneCounts.free
                  : o.id === 'ranked'
                    ? laneCounts.ranked
                    : laneCounts.challenge;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setLane(o.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
                  selected
                    ? o.id === 'ranked'
                      ? 'border-amber-500 bg-amber-500 text-black'
                      : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                    : 'border-[var(--outline)] text-[var(--prose-2)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {o.label}
                <span className="ml-1 opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((o) => {
            const selected = sort === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSort(o.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs ${
                  selected
                    ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                    : 'border-[var(--outline)] text-[var(--prose-2)] hover:bg-[var(--surface-raised)]'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--outline)] px-3 py-6 text-center text-sm text-[var(--prose-2)]">
            No rolls in this lane yet.
            {lane === 'ranked'
              ? ' Generate with Roll → Ranked to fill this list.'
              : lane === 'free'
                ? ' Generate with Roll → Free play.'
                : ' Try Daily / Weekly challenges.'}
          </p>
        ) : null}

        <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
          {sorted.map((r, idx) => {
            const top = [...r.badges]
              .sort((a, b) => b.ep - a.ep)
              .slice(0, 4);
            const extra = Math.max(0, r.badges.length - top.length);
            const isBest = best?.id === r.id;
            const showRank =
              sort === 'best_ep' ||
              sort === 'worst_ep' ||
              sort === 'rarest' ||
              sort === 'most_badges';
            return (
              <li
                key={r.id}
                className={`flex flex-col gap-2 px-3 py-3 hover:bg-[var(--surface-raised)] sm:flex-row sm:items-center sm:justify-between ${
                  isBest ? 'bg-amber-500/5' : ''
                }`}
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {showRank && (
                      <span className="mono-number w-6 text-xs font-bold text-[var(--prose-3)]">
                        #{idx + 1}
                      </span>
                    )}
                    <div className="mono-number text-lg font-bold">
                      {r.number.toLocaleString()}
                    </div>
                    {isBest && (
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                        Best
                      </span>
                    )}
                    {(() => {
                      const l = rollLane(r);
                      if (l === 'ranked') {
                        return (
                          <span className="rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                            Ranked
                          </span>
                        );
                      }
                      if (l === 'challenge') {
                        return (
                          <span className="rounded border border-[var(--outline)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--prose-2)]">
                            Challenge
                          </span>
                        );
                      }
                      return (
                        <span className="rounded border border-[var(--outline)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--prose-3)]">
                          Free
                        </span>
                      );
                    })()}
                    <time className="text-xs text-[var(--prose-3)]">
                      {fmtDate(r.rolledAt)}
                    </time>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--prose-3)]">
                    <RarityBadge rarity={r.rarity} />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {r.totalEP.toLocaleString()} EP
                    </span>
                    <span>
                      Top {topPercentFromEP(r.totalEP)}%
                    </span>
                    <span>
                      {r.badges.length} badge
                      {r.badges.length === 1 ? '' : 's'}
                    </span>
                    {r.challengeKey && (
                      <span className="font-mono">{r.challengeKey}</span>
                    )}
                  </div>
                  {top.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {top.map((b) => (
                        <BadgePill key={b.id} badge={b} compact />
                      ))}
                      {extra > 0 && (
                        <span className="rounded-full border border-[var(--outline)] bg-[var(--bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--prose-2)]">
                          +{extra} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className="border border-[var(--outline)] px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--prose-2)] hover:border-[var(--prose-2)] hover:text-[var(--prose)]"
                    onClick={() => setReplayRoll(r)}
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    className="border border-[var(--prose)] px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide"
                    onClick={() => setShareRoll(r)}
                  >
                    Share
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {shareRoll && (
        <SharePanel
          roll={shareRoll}
          rollCount={lifetimeRollCount}
          showRollCount={settings.shareShowRollCount}
          onClose={() => setShareRoll(null)}
          onGoAccount={onGoAccount}
        />
      )}

      {replayRoll && (
        <RollReplayModal
          roll={replayRoll}
          onClose={() => setReplayRoll(null)}
          onShare={() => {
            setShareRoll(replayRoll);
            setReplayRoll(null);
          }}
        />
      )}
    </div>
  );
}
