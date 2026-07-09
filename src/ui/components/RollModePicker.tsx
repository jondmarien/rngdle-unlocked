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
    short: 'Local RNG · unlimited',
    detail:
      'Unlimited CSPRNG rolls in your browser. Every Generate is a new number. Fun and offline-friendly — does not count for the competitive leaderboard or community crowns.',
  },
  {
    id: 'ranked',
    label: 'Ranked',
    short: 'Server RNG · board',
    detail:
      'Server-issued free-play rolls. Requires sign-in and a public @username. These are the only free-play rolls that count for the leaderboard, today’s/week’s best, and overtake alerts. Fair competition.',
  },
  {
    id: 'daily',
    label: 'Daily',
    short: 'One personal number / UTC day',
    detail:
      'Shared day seed + your account makes a fixed personal number for today. Same inputs always match. Optional challenge — Free and Ranked stay available anytime.',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    short: 'One personal number / UTC week',
    detail:
      'Same idea as Daily, but the seed lasts the whole ISO week. Free and Ranked free play stay unlimited whenever you want them.',
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
          Local free play, competitive Ranked (server), or optional timed
          challenges.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Roll mode"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
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
              className={`rounded-lg border px-2.5 py-2.5 text-left transition sm:px-3 ${
                selected
                  ? m.id === 'ranked'
                    ? 'border-amber-500 bg-amber-500 text-black'
                    : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                  : 'border-[var(--outline)] bg-[var(--surface)] text-[var(--prose)] hover:border-[var(--prose-2)]'
              }`}
            >
              <span className="block text-sm font-bold leading-tight">
                {m.label}
              </span>
              <span
                className={`mt-1 block text-[11px] leading-snug sm:text-xs ${
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
