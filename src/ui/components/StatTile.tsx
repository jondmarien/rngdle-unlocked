/** Shared stat tile — replaces the per-screen Stat / Tile / StatCard copies. */
export function StatTile({
  label,
  value,
  sub,
  className = 'border-(--outline) bg-(--surface)',
  labelClassName = 'text-sm font-semibold text-(--prose-2)',
}: {
  label: string;
  value: string;
  sub?: string;
  /** Border/background classes (accent-themed on Profile). */
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${className}`}>
      <div className={labelClassName}>{label}</div>
      <div className="mono-number text-xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-(--prose-3)">{sub}</div>}
    </div>
  );
}
