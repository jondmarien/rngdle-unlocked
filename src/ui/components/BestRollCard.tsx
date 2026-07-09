import {
  topPercentFromEP,
  type RollHighlight,
  type RollResult,
} from '../../game';
import { EPPill } from './EPPill';
import { RarityBadge } from './RarityBadge';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Pinned best-roll summary (History / Showcase / Home).
 * Prefer full RollResult when available so Replay works.
 */
export function BestRollCard({
  best,
  fullRoll,
  onReplay,
  onShare,
  compact = false,
}: {
  best: RollHighlight;
  /** Full history row if still in cap — enables full badge replay */
  fullRoll?: RollResult | null;
  onReplay?: () => void;
  onShare?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-[var(--surface)] to-[var(--surface)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
            Your best roll
          </p>
          <div
            className={`mono-number mt-1 font-bold tracking-tight ${
              compact ? 'text-2xl' : 'text-3xl sm:text-4xl'
            }`}
          >
            {best.number.toLocaleString()}
          </div>
        </div>
        {(onReplay || onShare) && (
          <div className="flex flex-wrap gap-2">
            {onReplay && fullRoll && (
              <button
                type="button"
                onClick={onReplay}
                className="border border-[var(--outline)] px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--prose-2)] hover:border-[var(--prose-2)] hover:text-[var(--prose)]"
              >
                Replay
              </button>
            )}
            {onShare && fullRoll && (
              <button
                type="button"
                onClick={onShare}
                className="border border-[var(--prose)] px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide"
              >
                Share
              </button>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={best.rarity} />
        <EPPill ep={best.totalEP} />
        <span className="text-sm text-[var(--prose-2)]">
          Top {topPercentFromEP(best.totalEP)}%
        </span>
      </div>
      <p className="mt-1.5 text-xs text-[var(--prose-3)]">
        {best.badgeCount} badge{best.badgeCount === 1 ? '' : 's'} ·{' '}
        {fmtDate(best.rolledAt)}
      </p>
      {best.topBadges.length > 0 && (
        <p className="mt-2 text-sm leading-snug text-[var(--prose-2)]">
          {best.topBadges.join(' · ')}
          {best.badgeCount > best.topBadges.length
            ? ` · +${best.badgeCount - best.topBadges.length} more`
            : ''}
        </p>
      )}
      {!fullRoll && onReplay && (
        <p className="mt-2 text-[11px] text-[var(--prose-3)]">
          Full badge replay unavailable — roll aged out of the 500-history cap.
        </p>
      )}
    </div>
  );
}
