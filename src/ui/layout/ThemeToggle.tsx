import type { ThemeMode } from '../../game';

const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'Auto' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeToggle({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (m: ThemeMode) => void;
}) {
  return (
    <div
      className="inline-flex max-w-full overflow-hidden rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-0.5"
      role="group"
      aria-label="Theme"
    >
      {MODES.map((m) => {
        const selected = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            title={m.id === 'system' ? 'Follow system' : m.label}
            onClick={() => onChange(m.id)}
            className={`min-w-[4.25rem] rounded-md px-3 py-1.5 text-center text-xs font-semibold tracking-wide transition-colors sm:min-w-[5rem] sm:text-sm ${
              selected
                ? 'bg-[var(--prose)] text-[var(--bg)] shadow-sm'
                : 'text-[var(--prose-2)] hover:bg-[var(--surface-raised)] hover:text-[var(--prose)]'
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
