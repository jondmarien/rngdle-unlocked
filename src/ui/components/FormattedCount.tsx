import { formatCount } from '../../lib/format';
import { useGameSettings } from '../../state/GameProvider';

/** EP / roll count that respects abbreviateLargeNumbers (full value in title). */
export function FormattedCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { settings } = useGameSettings();
  const compact = settings.abbreviateLargeNumbers === true;
  const full = formatCount(value);
  const shown = formatCount(value, { compact });
  return (
    <span
      className={className}
      title={compact && shown !== full ? full : undefined}
    >
      {shown}
    </span>
  );
}
