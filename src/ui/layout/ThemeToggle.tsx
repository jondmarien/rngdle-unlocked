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
    <div className="flex overflow-hidden rounded border border-[var(--outline)]">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          title={m}
          onClick={() => onChange(m)}
          className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
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
