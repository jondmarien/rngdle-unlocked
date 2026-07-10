import { useMemo, useState } from 'react';
import type { RollResult } from '../../game';
import { formatDateTime } from '../../lib/format';
import { useGame, useGameSettings } from '../../state/GameProvider';
import { BestRollCard } from '../components/BestRollCard';
import { RollReplayModal } from '../components/RollReplayModal';
import { LazySharePanel } from '../components/LazySharePanel';
import { StatTile } from '../components/StatTile';

const SHOWCASE_LABEL = 'text-xs font-semibold text-(--prose-3)';

export function ShowcaseScreen({
  onGoAccount,
}: {
  onGoAccount?: () => void;
} = {}) {
  const { stats, lifetimeRollCount, lifetimeEP, history } = useGame();
  const { settings } = useGameSettings();
  const best = stats.bestRoll;
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);

  const bestFull = useMemo(() => {
    if (!best) return null;
    return history.find((r) => r.id === best.id) ?? null;
  }, [history, best]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">Showcase</h1>
        <p className="text-xs text-(--prose-3)">
          Streaks, best single roll, and best consecutive runs. For histograms
          and a 28-day calendar, open the Stats tab.
        </p>
      </div>

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
          <p className="text-sm text-(--prose-3)">No rolls yet — go spin.</p>
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
              className="rounded-xl border border-(--outline) bg-(--surface) p-3"
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
                Avg {c.avgEP.toLocaleString()} EP · {formatDateTime(c.fromAt)} →{' '}
                {formatDateTime(c.toAt)}
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

      {shareRoll && (
        <LazySharePanel
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
