import { useState } from 'react';
import { topPercentFromPercentile } from '../../game';
import { useGame } from '../../state/GameProvider';
import { RarityBadge } from '../components/RarityBadge';
import { SharePanel } from '../components/ShareCard';
import type { RollResult } from '../../game';

export function HistoryScreen({
  onGoAccount,
}: {
  onGoAccount?: () => void;
} = {}) {
  const {
    history,
    selectRoll,
    lifetimeRollCount,
    settings,
  } = useGame();
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);

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
      </p>
      <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
        {history.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--surface-raised)]"
          >
            <button
              type="button"
              className="text-left"
              onClick={() => selectRoll(r)}
            >
              <div className="mono-number text-lg font-bold">
                {r.number.toLocaleString()}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--prose-3)]">
                <RarityBadge rarity={r.rarity} />
                <span>{r.totalEP.toLocaleString()} EP</span>
                <span>Top {topPercentFromPercentile(r.percentile)}%</span>
              </div>
            </button>
            <button
              type="button"
              className="text-xs font-bold uppercase"
              onClick={() => setShareRoll(r)}
            >
              Share
            </button>
          </li>
        ))}
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
    </div>
  );
}
