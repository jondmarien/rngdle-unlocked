import type { RarityTier } from '../../../game';
import { ARCADE_BURST, ARCADE_GLOW } from '../../../lib/arcade-icons';
import { RarityBadge } from '../RarityBadge';

function overlayFor(rarity: RarityTier): string | null {
  switch (rarity) {
    case 'rare':
      return ARCADE_GLOW.rare;
    case 'epic':
      return ARCADE_GLOW.epic;
    case 'anomaly':
      return ARCADE_BURST.anomaly;
    case 'mythic':
    case 'divine':
      return ARCADE_BURST.mythic;
    default:
      return null;
  }
}

function intensityClass(rarity: RarityTier): string {
  switch (rarity) {
    case 'rare':
      return 'arcade-reveal-flash-rare';
    case 'epic':
      return 'arcade-reveal-flash-epic';
    case 'anomaly':
      return 'arcade-reveal-flash-anomaly';
    case 'mythic':
    case 'divine':
      return 'arcade-reveal-flash-mythic';
    default:
      return '';
  }
}

/**
 * Last-roll reveal card with rarity-scaled punch + Phase 0 glow/burst.
 * Common/Uncommon stay quiet. One card per batch settle.
 */
export function ArcadeRollReveal({
  number,
  digitsAwarded,
  totalEP,
  rarity,
  batchSize,
  revealKey,
}: {
  number: number;
  digitsAwarded: number;
  totalEP: number;
  rarity: RarityTier;
  batchSize: number;
  /** Bump when a new roll settles so CSS animations re-fire */
  revealKey: number;
}) {
  const overlay = overlayFor(rarity);
  const intensity = intensityClass(rarity);
  const edge =
    rarity === 'anomaly' || rarity === 'mythic' || rarity === 'divine'
      ? `arcade-reveal-edge arcade-reveal-edge-${rarity === 'divine' ? 'mythic' : rarity}`
      : '';

  return (
    <div
      key={revealKey}
      className={`relative overflow-hidden rounded-lg border border-(--outline) px-3 py-3 ${intensity} ${edge}`}
    >
      {overlay && (
        <img
          src={overlay}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full object-cover opacity-55 mix-blend-screen"
        />
      )}
      <div className="relative z-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={`mono-number text-2xl font-bold rarity-${rarity} ${intensity ? 'arcade-reveal-value' : ''}`}
          >
            {number.toLocaleString()}
          </p>
          <p className="text-sm text-(--prose-2)">
            +{digitsAwarded.toLocaleString()} Digits ·{' '}
            {totalEP.toLocaleString()} EP (Arcade only)
            {batchSize > 1 ? ` · last of ×${batchSize}` : ''}
          </p>
        </div>
        <div className={intensity ? 'arcade-reveal-badge' : undefined}>
          <RarityBadge rarity={rarity} />
        </div>
      </div>
    </div>
  );
}
