import { topPercentFromEP, type RollResult } from '../../game';
import { BadgeBreakdown } from './BadgeCard';
import { EPPill } from './EPPill';
import { RarityBadge } from './RarityBadge';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Full badge breakdown for a past roll (History / Showcase / best pin). */
export function RollReplayModal({
  roll,
  onClose,
  onShare,
}: {
  roll: RollResult;
  onClose: () => void;
  onShare?: () => void;
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
                Top {topPercentFromEP(roll.totalEP)}%
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
          {onShare && (
            <button
              type="button"
              className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]"
              onClick={onShare}
            >
              Share this roll
            </button>
          )}
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
