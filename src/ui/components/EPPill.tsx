export function EPPill({ ep, label = 'EP' }: { ep: number; label?: string }) {
  return (
    <span className="mono-number rounded border border-[var(--outline)] bg-[var(--surface)] px-2 py-0.5 text-sm font-semibold">
      {ep.toLocaleString()} {label}
    </span>
  );
}
