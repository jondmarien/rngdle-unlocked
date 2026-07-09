import { useState } from 'react';
import {
  topPercentFromPercentile,
  type RollResult,
} from '../../game';
import { useGame } from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { BadgePill } from '../components/BadgePill';
import { EPPill } from '../components/EPPill';
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
  const { history, lifetimeRollCount, settings } = useGame();
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);

  if (history.length === 0) {
    return (
      <p className="text-center text-[var(--prose-3)]">
        No rolls yet. Hit Generate on the Roll tab.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold uppercase tracking-wider">History</h1>
      <p className="text-xs text-[var(--prose-3)]">
        Last {history.length} rolls (cap 500). Lifetime count never shrinks.
        Use <strong className="text-[var(--prose-2)]">Replay</strong> to see
        the full badge breakdown for a past roll.
      </p>
      <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
        {history.map((r) => {
          const top = [...r.badges]
            .sort((a, b) => b.ep - a.ep)
            .slice(0, 4);
          const extra = Math.max(0, r.badges.length - top.length);
          return (
            <li
              key={r.id}
              className="flex flex-col gap-2 px-3 py-3 hover:bg-[var(--surface-raised)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <div className="mono-number text-lg font-bold">
                    {r.number.toLocaleString()}
                  </div>
                  <time className="text-xs text-[var(--prose-3)]">
                    {fmtDate(r.rolledAt)}
                  </time>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--prose-3)]">
                  <RarityBadge rarity={r.rarity} />
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {r.totalEP.toLocaleString()} EP
                  </span>
                  <span>Top {topPercentFromPercentile(r.percentile)}%</span>
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

function RollReplayModal({
  roll,
  onClose,
  onShare,
}: {
  roll: RollResult;
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-lg border-2 border-[var(--outline)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--outline)] px-4 py-3">
          <h2 className="text-lg font-bold uppercase tracking-wider">
            Roll replay
          </h2>
          <button
            type="button"
            className="text-sm font-semibold text-[var(--prose-3)] hover:text-[var(--prose)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="rounded-xl border border-[var(--outline)] bg-[var(--bg)] p-4 text-center">
            <div className="mono-number text-4xl font-bold tracking-tight">
              {roll.number.toLocaleString()}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <RarityBadge rarity={roll.rarity} />
              <EPPill ep={roll.totalEP} />
              <span className="text-sm text-[var(--prose-2)]">
                Top {topPercentFromPercentile(roll.percentile)}%
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--prose-3)]">
              {fmtDate(roll.rolledAt)}
              {roll.challengeKey ? ` · ${roll.challengeKey}` : ''}
              {roll.attestationSeal ? ' · sealed' : ''}
            </p>
            <p className="mt-1 text-sm text-[var(--prose-2)]">
              {roll.badges.length} badge
              {roll.badges.length === 1 ? '' : 's'} on this roll
            </p>
          </div>

          <BadgeBreakdown
            badges={roll.badges}
            number={roll.number}
            animateCascade={false}
            autoScroll={false}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--outline)] px-4 py-3">
          <button
            type="button"
            className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]"
            onClick={onShare}
          >
            Share this roll
          </button>
          <button
            type="button"
            className="border border-[var(--outline)] px-3 py-2 text-xs font-bold uppercase text-[var(--prose-2)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
