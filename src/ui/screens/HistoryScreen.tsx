import { useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  listUnlockedSeals,
  rarityRank,
  topPercentFromEP,
  type RollResult,
} from '../../game';
import { formatDateTime } from '../../lib/format';
import { historyPath, type HistoryView } from '../../lib/routes';
import { useGame, useGameSettings } from '../../state/GameProvider';
import { BadgePill } from '../components/BadgePill';
import { BestRollCard } from '../components/BestRollCard';
import { RollReplayModal } from '../components/RollReplayModal';
import { RarityBadge } from '../components/RarityBadge';
import {
  RelativeTime,
  RollLaneChip,
  laneFromSource,
} from '../components/RollRow';
import { SegmentedToggle } from '../components/SegmentedToggle';
import { LazySharePanel } from '../components/LazySharePanel';
import { StatTile } from '../components/StatTile';

const CHIP_CLASS =
  'rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:text-xs';
const CHIP_INACTIVE =
  'border-(--outline) text-(--prose-2) hover:bg-(--surface-raised)';

const SHOWCASE_LABEL = 'text-xs font-semibold text-(--prose-3)';

const VIEW_OPTIONS: { id: HistoryView; label: string }[] = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'rolls', label: 'All rolls' },
];

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
  if (r.source === 'challenge' || r.challengeKey) return 'challenge';
  return laneFromSource(r.source);
}

function filterByLane(list: RollResult[], lane: HistoryLane): RollResult[] {
  if (lane === 'all') return list;
  return list.filter((r) => rollLane(r) === lane);
}

function matchesHistorySearch(r: RollResult, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (String(r.number).includes(q)) return true;
  if (r.number.toLocaleString().toLowerCase().includes(q)) return true;
  if (String(r.totalEP).includes(q)) return true;
  if (r.totalEP.toLocaleString().toLowerCase().includes(q)) return true;
  if (`${r.totalEP} ep`.toLowerCase().includes(q)) return true;
  for (const b of r.badges) {
    if (b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q)) {
      return true;
    }
  }
  return false;
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
      return copy.sort((a, b) => b.totalEP - a.totalEP || byTime(a, b));
    case 'worst_ep':
      return copy.sort((a, b) => a.totalEP - b.totalEP || byTime(a, b));
    case 'rarest':
      return copy.sort(
        (a, b) =>
          rarityRank(b.rarity) - rarityRank(a.rarity) || b.totalEP - a.totalEP,
      );
    case 'commonest':
      return copy.sort(
        (a, b) =>
          rarityRank(a.rarity) - rarityRank(b.rarity) || a.totalEP - b.totalEP,
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
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

function laneHeading(lane: HistoryLane): string {
  switch (lane) {
    case 'all':
      return 'All rolls';
    case 'free':
      return 'Free play';
    case 'ranked':
      return 'Ranked';
    case 'challenge':
      return 'Challenge';
    default: {
      const _exhaustive: never = lane;
      return _exhaustive;
    }
  }
}

export function HistoryScreen({
  onGoAccount,
  initialView = 'rolls',
}: {
  onGoAccount?: () => void;
  initialView?: HistoryView;
} = {}) {
  const { history, lifetimeRollCount, lifetimeEP, stats, collection } =
    useGame();
  const { settings } = useGameSettings();
  const reduceMotion = useReducedMotion();
  const unlockedSealNames = useMemo(
    () =>
      settings.shareShowUnlockedBadges !== false
        ? listUnlockedSeals(collection.map((c) => c.badgeId)).map((s) => s.name)
        : [],
    [collection, settings.shareShowUnlockedBadges],
  );
  const [view, setView] = useState<HistoryView>(initialView);
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);
  const [sort, setSort] = useState<HistorySort>('newest');
  const [lane, setLane] = useState<HistoryLane>('all');
  const [search, setSearch] = useState('');

  const best = stats.bestRoll;
  const bestFull = useMemo(() => {
    if (!best) return null;
    return history.find((r) => r.id === best.id) ?? null;
  }, [history, best]);

  const filtered = useMemo(() => {
    const byLane = filterByLane(history, lane);
    return byLane.filter((r) => matchesHistorySearch(r, search));
  }, [history, lane, search]);

  const laneFilteredCount = useMemo(
    () => filterByLane(history, lane).length,
    [history, lane],
  );

  const sorted = useMemo(() => sortHistory(filtered, sort), [filtered, sort]);

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

  function changeView(next: HistoryView) {
    setView(next);
    window.history.replaceState({}, '', historyPath(next));
  }

  let panel: ReactNode;
  switch (view) {
    case 'highlights':
      panel = (
        <div className="space-y-6">
          <p className="text-xs text-(--prose-3)">
            Streaks, best single roll, and best consecutive runs. For histograms
            and a 28-day calendar, open the Stats tab.
          </p>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile
              label="Day streak"
              value={String(stats.dayStreak)}
              sub={`Best ${stats.bestDayStreak}`}
              labelClassName={SHOWCASE_LABEL}
            />
            <StatTile
              label="Quality streak"
              value={String(stats.qualityStreak)}
              sub={`Best ${stats.bestQualityStreak} (uncommon+)`}
              labelClassName={SHOWCASE_LABEL}
            />
            <StatTile
              label="Lifetime rolls"
              value={lifetimeRollCount.toLocaleString()}
              labelClassName={SHOWCASE_LABEL}
            />
            <StatTile
              label="Lifetime EP"
              value={lifetimeEP.toLocaleString()}
              labelClassName={SHOWCASE_LABEL}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
              Best roll
            </h2>
            {!best ? (
              <p className="text-sm text-(--prose-3)">
                No rolls yet — go spin.
              </p>
            ) : (
              <BestRollCard
                best={best}
                fullRoll={bestFull}
                onReplay={bestFull ? () => setReplayRoll(bestFull) : undefined}
                onShare={bestFull ? () => setShareRoll(bestFull) : undefined}
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
              Best consecutive rolls
            </h2>
            <p className="text-xs text-(--prose-3)">
              Highest total EP across consecutive rolls (windows of 3 / 5 / 10).
            </p>
            {stats.bestConsecutive.length === 0 ? (
              <p className="text-sm text-(--prose-3)">
                Need at least 3 rolls in history to rank consecutive runs.
              </p>
            ) : (
              stats.bestConsecutive.map((c) => (
                <div
                  key={c.windowSize}
                  className="rounded-xl border border-(--accent)/30 bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide">
                      Best {c.windowSize}-in-a-row
                    </h3>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {c.totalEP.toLocaleString()} EP total
                    </span>
                  </div>
                  <p className="text-xs text-(--prose-3)">
                    Avg {c.avgEP.toLocaleString()} EP ·{' '}
                    {formatDateTime(c.fromAt)} → {formatDateTime(c.toAt)}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.rolls.map((r) => (
                      <li
                        key={r.id}
                        className="rounded border border-(--outline) bg-(--bg) px-2 py-1 text-xs"
                      >
                        <span className="mono-number font-bold">
                          {r.number.toLocaleString()}
                        </span>
                        <span className="ml-1 text-(--prose-3)">
                          {r.totalEP.toLocaleString()} EP
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>
      );
      break;
    case 'rolls':
      panel =
        history.length === 0 ? (
          <p className="text-center text-(--prose-3)">
            No rolls yet. Hit Generate on the Roll tab.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-(--prose-3)">
              Last {history.length} rolls (cap 500). Lifetime count never
              shrinks. Filter by Free play (client) or Ranked (server).
            </p>

            {best && (
              <BestRollCard
                best={best}
                fullRoll={bestFull}
                onReplay={bestFull ? () => setReplayRoll(bestFull) : undefined}
                onShare={bestFull ? () => setShareRoll(bestFull) : undefined}
              />
            )}

            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-(--prose-3)">
                {laneHeading(lane)}
                <span className="ml-1.5 font-normal normal-case tracking-normal text-(--prose-3)">
                  ({sorted.length}
                  {lane !== 'all' || search.trim()
                    ? ` of ${laneFilteredCount}`
                    : ''}
                  )
                </span>
              </h2>

              <label className="mb-2 block">
                <span className="sr-only">Search history</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search number, badge, or EP…"
                  autoComplete="off"
                  className="w-full rounded-lg border border-(--outline) bg-(--bg) px-3 py-2 text-sm text-(--prose)"
                />
              </label>

              <SegmentedToggle
                className="mb-2 flex flex-wrap gap-1.5"
                chipClassName={CHIP_CLASS}
                inactiveClassName={CHIP_INACTIVE}
                options={LANE_OPTIONS.map((o) => {
                  const count =
                    o.id === 'all'
                      ? laneCounts.all
                      : o.id === 'free'
                        ? laneCounts.free
                        : o.id === 'ranked'
                          ? laneCounts.ranked
                          : laneCounts.challenge;
                  return {
                    id: o.id,
                    accent: o.id === 'ranked' ? ('amber' as const) : undefined,
                    label: (
                      <>
                        {o.label}
                        <span className="ml-1 opacity-80">({count})</span>
                      </>
                    ),
                  };
                })}
                value={lane}
                onChange={setLane}
              />

              <SegmentedToggle
                className="mb-2 flex flex-wrap gap-1.5"
                chipClassName={CHIP_CLASS}
                inactiveClassName={CHIP_INACTIVE}
                options={SORT_OPTIONS}
                value={sort}
                onChange={setSort}
              />

              {sorted.length === 0 ? (
                <p className="rounded-lg border border-dashed border-(--outline) px-3 py-6 text-center text-sm text-(--prose-2)">
                  {search.trim()
                    ? 'No rolls match this search.'
                    : `No rolls in this lane yet.${
                        lane === 'ranked'
                          ? ' Generate with Roll → Ranked to fill this list.'
                          : lane === 'free'
                            ? ' Generate with Roll → Free play.'
                            : ' Try Daily / Weekly challenges.'
                      }`}
                </p>
              ) : null}

              <ul className="divide-y divide-(--outline) border border-(--outline)">
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
                      className={`flex flex-col gap-2 px-3 py-3 hover:bg-(--surface-raised) sm:flex-row sm:items-center sm:justify-between ${
                        isBest ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          {showRank && (
                            <span className="mono-number w-6 text-xs font-bold text-(--prose-3)">
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
                          <RollLaneChip lane={rollLane(r)} />
                          <RelativeTime iso={r.rolledAt} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--prose-3)">
                          <RarityBadge rarity={r.rarity} />
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {r.totalEP.toLocaleString()} EP
                          </span>
                          <span>Top {topPercentFromEP(r.totalEP)}%</span>
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
                              <span className="rounded-full border border-(--outline) bg-(--bg) px-2 py-0.5 text-[11px] font-semibold text-(--prose-2)">
                                +{extra} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          className="border border-(--outline) px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-(--prose-2) hover:border-(--prose-2) hover:text-(--prose)"
                          onClick={() => setReplayRoll(r)}
                        >
                          Replay
                        </button>
                        <button
                          type="button"
                          className="border border-(--accent) bg-(--accent) px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-(--bg)"
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
          </div>
        );
      break;
    default: {
      const _exhaustive: never = view;
      panel = _exhaustive;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">History</h1>
        <p className="text-xs text-(--prose-3)">
          Highlights for streaks and best runs, or browse every roll in your
          history.
        </p>
      </div>

      <SegmentedToggle
        className="flex flex-wrap gap-1.5"
        chipClassName={CHIP_CLASS}
        inactiveClassName={CHIP_INACTIVE}
        options={VIEW_OPTIONS}
        value={view}
        onChange={changeView}
      />

      <motion.div
        layout
        key={view}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
      >
        {panel}
      </motion.div>

      {shareRoll && (
        <LazySharePanel
          roll={shareRoll}
          rollCount={lifetimeRollCount}
          showRollCount={settings.shareShowRollCount}
          showUnlockedBadges={settings.shareShowUnlockedBadges !== false}
          unlockedSealNames={unlockedSealNames}
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
