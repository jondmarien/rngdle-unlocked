import type { RarityTier } from '../../game';

const LABELS: Record<RarityTier, string> = {
  trash: 'Trash',
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  anomaly: 'Anomaly',
  mythic: 'Mythic',
};

export function RarityBadge({ rarity }: { rarity: RarityTier }) {
  return (
    <span
      className={`rarity-${rarity} text-base font-bold tracking-wide`}
    >
      {LABELS[rarity]}
    </span>
  );
}
