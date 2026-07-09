import type { ThemeMode } from '../../game';

const MODES: ThemeMode[] = ['light', 'system', 'dark'];

export function ThemeToggle({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (m: ThemeMode) => void;
}) {
  return (
    <div
      className="flex overflow-hidden rounded-md border border-[var(--outline)]"
      role="group"
      aria-label="Theme"
    >
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          title={m === 'system' ? 'System' : m}
          onClick={() => onChange(m)}
          className={`px-2.5 py-1.5 text-xs font-semibold capitalize sm:text-sm ${
            value === m
              ? 'bg-[var(--prose)] text-[var(--bg)]'
              : 'text-[var(--prose-2)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          {m === 'system' ? 'Auto' : m}
        </button>
      ))}
    </div>
  );
}
