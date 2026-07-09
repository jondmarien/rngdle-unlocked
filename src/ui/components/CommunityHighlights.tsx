import { useQuery } from '@tanstack/react-query';
import { coerceRarity } from '../../game';
import { rarityRing } from '../../lib/badge-theme';
import { fetchHighlights, type HighlightRoll } from '../../lib/highlights-api';
import { BadgePill } from './BadgePill';
import { RarityBadge } from './RarityBadge';

export type { HighlightRoll };

const MAX_PILLS = 4;
const POLL_MS = 90_000;

export function CommunityHighlights({
  onOpenProfile,
  onOpenRoll,
}: {
  onOpenProfile?: (username: string) => void;
  onOpenRoll?: (id: string, username?: string | null) => void;
} = {}) {
  // Query cache replaces the old module-level "soft session cache":
  // last good board survives remounts, poll + focus refresh, one soft retry.
  const { data, error } = useQuery({
    queryKey: ['highlights'],
    queryFn: ({ signal }) => fetchHighlights(signal),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 1_200,
  });

  if (error && !data) {
    return (
      <p className="mx-auto w-full max-w-md text-center text-xs text-[var(--prose-3)]">
        Could not load community highlights
      </p>
    );
  }

  if (!data) {
    return (
      <p className="mx-auto w-full max-w-md text-center text-xs text-[var(--prose-3)]">
        Loading community rolls…
      </p>
    );
  }

  const empty = !data.today && !data.week;
  if (empty) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-dashed border-[var(--outline)] bg-[var(--surface)]/60 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-[var(--prose-2)]">
          No Ranked rolls on the board yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--prose-3)]">
          Sign in, claim @username, and use Ranked free play — only server rolls
          claim today&apos;s / this week&apos;s crowns.
        </p>
      </div>
    );
  }

  const both = Boolean(data.today && data.week);

  return (
    <div
      className={`mx-auto grid w-full max-w-2xl gap-3 ${
        both ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
      }`}
    >
      {data.today && (
        <HighlightCard
          label="Today's best"
          roll={data.today}
          footer={`${data.todayRollCount.toLocaleString()} today`}
          onOpenProfile={onOpenProfile}
          onOpenRoll={onOpenRoll}
        />
      )}
      {data.week && (
        <HighlightCard
          label="Best this week"
          roll={data.week}
          footer={`${data.weekRollCount.toLocaleString()} this week`}
          onOpenProfile={onOpenProfile}
          onOpenRoll={onOpenRoll}
        />
      )}
    </div>
  );
}

function HighlightCard({
  label,
  roll,
  footer,
  onOpenProfile,
  onOpenRoll,
}: {
  label: string;
  roll: HighlightRoll;
  footer: string;
  onOpenProfile?: (username: string) => void;
  onOpenRoll?: (id: string, username?: string | null) => void;
}) {
  const rarity = coerceRarity(roll.rarity);
  const pills = roll.topBadges.slice(0, MAX_PILLS);
  const extra = Math.max(0, roll.badgeCount - pills.length);
  const clickable = Boolean(onOpenRoll);
  const display = formatHighlightNumber(roll.number);
  const digitCount = display.replace(/\D/g, '').length || 1;
  // Scale type so 1–7+ digit rolls stay inside the tile
  const tileFont =
    digitCount <= 2
      ? 'text-4xl'
      : digitCount <= 4
        ? 'text-2xl'
        : digitCount <= 6
          ? 'text-lg'
          : digitCount <= 8
            ? 'text-sm'
            : 'text-xs';

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--outline)] bg-[var(--surface)] px-3 py-3.5 text-center shadow-sm sm:px-4 sm:py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--prose-3)] sm:text-[11px]">
        {label}
      </p>

      <button
        type="button"
        disabled={!clickable}
        onClick={() => onOpenRoll?.(roll.id, roll.username)}
        className={`mx-auto mt-2.5 flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-[var(--surface-raised)] to-[var(--bg)] p-1.5 shadow-[0_0_28px_color-mix(in_srgb,var(--accent)_22%,transparent)] sm:mt-3 sm:h-24 sm:w-24 sm:p-2 ${rarityRing(rarity)} ${
          clickable
            ? 'cursor-pointer transition hover:scale-[1.03] active:scale-[0.98]'
            : ''
        }`}
        title={clickable ? 'Open roll' : undefined}
      >
        <span
          className={`mono-number max-w-full truncate text-center font-bold leading-none tracking-tight text-[var(--prose)] ${tileFont}`}
        >
          {display}
        </span>
      </button>

      <p className="mt-2.5 truncate text-xs text-[var(--prose-2)] sm:text-sm">
        by{' '}
        {roll.username && onOpenProfile ? (
          <button
            type="button"
            className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
            onClick={() => onOpenProfile(roll.username!)}
          >
            {roll.username}
          </button>
        ) : (
          <span className="font-semibold text-[var(--prose)]">
            {roll.username ?? 'someone'}
          </span>
        )}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
        <RarityBadge rarity={rarity} />
      </div>

      {pills.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
          {pills.map((b, i) => (
            <BadgePill key={`${b.name}-${i}`} badge={b} compact />
          ))}
          {extra > 0 && (
            <span className="rounded-full border border-[var(--outline)] bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--prose-2)]">
              +{extra}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-2.5">
        <p className="mono-number text-sm font-bold text-red-600 dark:text-red-400 sm:text-base">
          {roll.totalEP.toLocaleString()} EP
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--prose-3)] sm:text-[11px]">
          {footer}
        </p>
      </div>
    </section>
  );
}

function formatHighlightNumber(n: number): string {
  // Keep plain digits so more of the value fits the tile
  return String(Math.trunc(n));
}
