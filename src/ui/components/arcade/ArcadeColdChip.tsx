import { trashStreakThreshold } from '../../../game/arcade';

/**
 * Cold streak chip — consecutive Trash rolls toward soft-fail.
 */
export function ArcadeColdChip({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  const threshold = trashStreakThreshold();

  return (
    <span className="inline-flex items-center rounded-md bg-zinc-500/20 px-1.5 py-0.5 text-xs font-bold tabular-nums text-zinc-300">
      Cold {streak}/{threshold}
    </span>
  );
}
