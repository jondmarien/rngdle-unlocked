import { useMemo, useState } from 'react';
import {
  topPercentFromPercentile,
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

export function HistoryScreen({
  onGoAccount,
}: {
  onGoAccount?: () => void;
} = {}) {
  const { history, lifetimeRollCount, settings, stats } = useGame();
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);

  const best = stats.bestRoll;
  const bestFull = useMemo(() => {
    if (!best) return null;
    return history.find((r) => r.id === best.id) ?? null;
  }, [history, best]);

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
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          All rolls
        </h2>
        <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
          {history.map((r) => {
            const top = [...r.badges]
              .sort((a, b) => b.ep - a.ep)
              .slice(0, 4);
            const extra = Math.max(0, r.badges.length - top.length);
            const isBest = best?.id === r.id;
            return (
              <li
                key={r.id}
                className={`flex flex-col gap-2 px-3 py-3 hover:bg-[var(--surface-raised)] sm:flex-row sm:items-center sm:justify-between ${
                  isBest ? 'bg-amber-500/5' : ''
                }`}
              >
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <div className="mono-number text-lg font-bold">
                      {r.number.toLocaleString()}
                    </div>
                    {isBest && (
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                        Best
                      </span>
                    )}
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
                      Top {topPercentFromPercentile(r.percentile)}%
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
