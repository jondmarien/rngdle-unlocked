import type { RarityTier } from '../../game';
import { RARITY_LABELS } from '../../game';
import { RARITY_ICON } from '../../lib/icons';

export function RarityBadge({
  rarity,
  showIcon = true,
}: {
  rarity: RarityTier;
  showIcon?: boolean;
}) {
  return (
    <span
      className={`rarity-${rarity} inline-flex items-center gap-1.5 text-base font-bold tracking-wide`}
    >
      {showIcon && (
        <span className="icon-chip h-5 w-5 ring-1 ring-black/20 dark:ring-white/10">
          <img src={RARITY_ICON[rarity]} alt="" aria-hidden />
        </span>
      )}
      {RARITY_LABELS[rarity]}
    </span>
  );
}
