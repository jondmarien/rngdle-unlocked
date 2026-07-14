import type { RollMode } from '../../state/GameProvider';
import { useGameSettings } from '../../state/GameProvider';
import { SectionHeader } from './SectionHeader';

const MODES: {
  id: RollMode;
  label: string;
  short: string;
  detail: string;
}[] = [
  {
    id: 'free',
    label: 'Free play',
    short: 'Local RNG · practice',
    detail:
      'Unlimited CSPRNG rolls in your browser — offline-friendly practice. Synced progress appears on the Leaderboard → Practice board (social / honor system). Does not place on Ranked, and does not claim community today/week crowns.',
  },
  {
    id: 'ranked',
    label: 'Ranked',
    short: 'Server RNG · competitive',
    detail:
      'Server-issued free-play rolls. Requires sign-in and a public @username. Soft cap ~90 Ranked rolls/hour (server cost). These are the only free-play rolls that place on Leaderboard → Ranked, claim today/week/all-time community crowns, and trigger overtake alerts. Fair competition.',
  },
  {
    id: 'daily',
    label: 'Daily',
    short: 'One spin / UTC day',
    detail:
      'Shared UTC day seed + your account id → one personal number for today. Generate locks after your first spin this UTC day (re-spinning would only repeat the same number). Shows under History → Challenge. Free and Ranked stay available anytime. Not Ranked crowns.',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    short: 'One spin / UTC week',
    detail:
      'Same as Daily for the whole ISO week — one spin, then locked until the next UTC week. History → Challenge. Free and Ranked stay unlimited. Not Ranked crowns.',
  },
];

export function RollModePicker({
  value,
  onChange,
}: {
  value: RollMode;
  onChange: (m: RollMode) => void;
}) {
  const { settings, setHowToRollOpen } = useGameSettings();
  const open = settings.howToRollOpen;
  const active = MODES.find((m) => m.id === value) ?? MODES[0]!;

  return (
    <div className="w-full max-w-lg space-y-3 text-left">
      <SectionHeader
        title="How to roll"
        open={open}
        onToggle={() => setHowToRollOpen(!open)}
      />

      {open && (
        <p className="text-sm leading-snug text-(--prose-2)">
          Free play for practice, Ranked for the competitive board, or optional
          Daily / Weekly challenges.
        </p>
      )}

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
              className={`rounded-lg border text-left transition ${
                open ? 'px-2.5 py-2.5 sm:px-3' : 'px-2.5 py-2 sm:px-3'
              } ${
                selected
                  ? m.id === 'ranked'
                    ? 'border-amber-500 bg-amber-500 text-black'
                    : 'border-(--accent) bg-(--accent) text-(--bg)'
                  : 'border-(--outline) bg-(--surface) text-(--prose) hover:border-(--accent)/45'
              }`}
            >
              <span className="block text-sm font-bold leading-tight">
                {m.label}
              </span>
              {open && (
                <span
                  className={`mt-1 block text-[11px] leading-snug sm:text-xs ${
                    selected ? 'opacity-90' : 'text-(--prose-2)'
                  }`}
                >
                  {m.short}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <p className="rounded-lg border border-(--outline) bg-(--surface-raised) px-3 py-2.5 text-sm leading-relaxed text-(--prose-2)">
          <span className="font-semibold text-(--prose)">{active.label}: </span>
          {active.detail}
        </p>
      )}
    </div>
  );
}
