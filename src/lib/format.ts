/** Shared date formatting — replaces the per-screen copy-pasted helpers. */

/** Full locale date + time; falls back to the raw string on bad input. */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Compact "Mar 4, 3:12 PM" style for tight rails (Latest runs). */
export function formatDateTimeCompact(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Medium date + short time; null when the input is missing/invalid. */
export function formatDateTimeMedium(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

/**
 * Relative age for inbox / collection rails.
 * Just now → s → m → h → d → compact date for older; null when missing/invalid.
 */
export function formatRelative(
  iso: string | undefined,
  now: number = Date.now(),
): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, Math.floor((now - t) / 1000));
  if (sec < 10) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDateTimeCompact(iso);
}

const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format a count / EP total. When `compact` is true, uses locale compact
 * notation (e.g. 4.8M); otherwise full grouping (e.g. 4,827,699).
 */
export function formatCount(n: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(n)) return String(n);
  if (opts?.compact) return compactFormatter.format(n);
  return n.toLocaleString();
}
