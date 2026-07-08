import type { RarityTier } from '../../game';

export function NumberDisplay({
  value,
  rarity,
  animate,
}: {
  value: number | null;
  rarity?: RarityTier;
  animate?: boolean;
}) {
  const text =
    value == null ? '??????' : value.toLocaleString('en-US');
  return (
    <div
      className={`mono-number text-center text-5xl font-bold sm:text-7xl ${rarity ? `rarity-${rarity}` : 'text-[var(--prose)]'} ${animate ? 'number-reveal' : ''}`}
    >
      {text}
    </div>
  );
}
