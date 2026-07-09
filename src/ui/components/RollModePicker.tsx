import type { RollMode } from '../../state/GameProvider';

const MODES: {
  id: RollMode;
  label: string;
  short: string;
  detail: string;
}[] = [
  {
    id: 'free',
    label: 'Free play',
    short: 'Fresh random each time',
    detail:
      'Unlimited CSPRNG rolls in your browser. Every Generate is a new number. This is the main game.',
  },
  {
    id: 'daily',
    label: 'Daily',
    short: 'One personal number per UTC day',
    detail:
      'Shared day seed + your account makes a fixed personal number for today. Same inputs always match. Switch back to Free play anytime for unlimited random rolls.',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    short: 'One personal number per UTC week',
    detail:
      'Same idea as Daily, but the seed lasts the whole ISO week. Good for a weekly challenge. Free play stays unlimited whenever you want it.',
  },
];

export function RollModePicker({
  value,
  onChange,
}: {
  value: RollMode;
  onChange: (m: RollMode) => void;
}) {
  const active = MODES.find((m) => m.id === value) ?? MODES[0]!;

  return (
    <div className="w-full max-w-lg space-y-3 text-left">
      <div>
        <p className="text-sm font-semibold text-[var(--prose)]">How to roll</p>
        <p className="mt-0.5 text-sm leading-snug text-[var(--prose-2)]">
          Pick free unlimited RNG, or an optional timed challenge.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Roll mode"
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {MODES.map((m) => {
          const selected = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(m.id)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                  : 'border-[var(--outline)] bg-[var(--surface)] text-[var(--prose)] hover:border-[var(--prose-2)]'
              }`}
            >
              <span className="block text-sm font-bold leading-tight">
                {m.label}
              </span>
              <span
                className={`mt-1 block text-xs leading-snug ${
                  selected ? 'opacity-90' : 'text-[var(--prose-2)]'
                }`}
              >
                {m.short}
              </span>
            </button>
          );
        })}
      </div>

      <p className="rounded-lg border border-[var(--outline)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm leading-relaxed text-[var(--prose-2)]">
        <span className="font-semibold text-[var(--prose)]">{active.label}: </span>
        {active.detail}
      </p>
    </div>
  );
}
