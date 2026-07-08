import type { BadgeHit } from '../../game';

export function BadgePill({ badge }: { badge: BadgeHit }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[var(--outline)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs"
      title={`${badge.description} (+${badge.ep.toLocaleString()} EP)`}
    >
      <span className="font-semibold uppercase tracking-wide">{badge.name}</span>
      <span className="text-[var(--prose-3)]">+{badge.ep.toLocaleString()}</span>
    </span>
  );
}
