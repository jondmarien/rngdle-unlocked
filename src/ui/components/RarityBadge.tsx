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
      className={`rarity-${rarity} text-sm font-bold uppercase tracking-[0.2em]`}
    >
      {LABELS[rarity]}
    </span>
  );
}
