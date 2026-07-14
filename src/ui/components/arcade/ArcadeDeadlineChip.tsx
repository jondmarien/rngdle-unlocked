/**
 * Active Deadline pressure chip (opt-in shop upgrade).
 */
export function ArcadeDeadlineChip({
  digits,
  target,
  rollsRemaining,
}: {
  digits: number;
  target: number;
  rollsRemaining: number;
}) {
  if (target <= 0 || rollsRemaining <= 0) return null;

  return (
    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold tabular-nums text-amber-400">
      Deadline {digits.toLocaleString()}/{target.toLocaleString()} ·{' '}
      {rollsRemaining} left
    </span>
  );
}
