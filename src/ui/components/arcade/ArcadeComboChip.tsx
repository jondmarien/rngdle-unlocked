/**
 * Combo streak chip — warmer / brighter as streak climbs (5+ / 10+ / 20+).
 */
export function ArcadeComboChip({ streak }: { streak: number }) {
  if (streak <= 0) return null;

  let tier = 'arcade-combo-low';
  if (streak >= 20) tier = 'arcade-combo-hot';
  else if (streak >= 10) tier = 'arcade-combo-high';
  else if (streak >= 5) tier = 'arcade-combo-mid';

  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${tier}`}
    >
      Combo {streak}
    </span>
  );
}
