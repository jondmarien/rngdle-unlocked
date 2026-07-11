import { useQuery } from '@tanstack/react-query';
import { coerceRarity } from '../../game';
import { rarityRing } from '../../lib/badge-theme';
import { fetchHighlights, type HighlightRoll } from '../../lib/highlights-api';
import { BadgePill } from './BadgePill';
import { QueryErrorBanner } from './QueryErrorBanner';
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
  const { data, error, refetch } = useQuery({
    queryKey: ['highlights'],
    queryFn: ({ signal }) => fetchHighlights(signal),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 1_200,
  });

  if (error && !data) {
    return (
      <div className="mx-auto w-full max-w-md">
        <QueryErrorBanner
          message="Could not load community highlights"
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="mx-auto w-full max-w-md text-center text-xs text-(--prose-3)">
        Loading community rolls…
      </p>
    );
  }

  const empty = !data.today && !data.week && !data.allTime;
  if (empty) {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-dashed border-(--outline) bg-(--surface)/60 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-(--prose-2)">
          No Ranked rolls on the board yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-(--prose-3)">
          Sign in, claim @username, and use Ranked free play — only server rolls
          claim today&apos;s / this week&apos;s / all-time crowns.
        </p>
      </div>
    );
  }

  const tileCount = [data.today, data.week, data.allTime].filter(
    Boolean,
  ).length;
  const gridCols =
    tileCount >= 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : tileCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1';

  return (
    <div className={`mx-auto grid w-full max-w-4xl gap-3 ${gridCols}`}>
      {data.today && (
        <HighlightCard
          label="Ranked · Today's best"
          roll={data.today}
          footer={`${data.todayRollCount.toLocaleString()} today`}
          onOpenProfile={onOpenProfile}
          onOpenRoll={onOpenRoll}
        />
      )}
      {data.week && (
        <HighlightCard
          label="Ranked · Best this week"
          roll={data.week}
          footer={`${data.weekRollCount.toLocaleString()} this week`}
          onOpenProfile={onOpenProfile}
          onOpenRoll={onOpenRoll}
        />
      )}
      {data.allTime && (
        <HighlightCard
          label="Ranked · All-time best"
          roll={data.allTime}
          footer={`${data.allTimeRollCount.toLocaleString()} ranked`}
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
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-(--outline) bg-(--surface) px-3 py-3.5 text-center shadow-sm sm:px-4 sm:py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-(--prose-3) sm:text-[11px]">
        {label}
      </p>

      <button
        type="button"
        disabled={!clickable}
        onClick={() => onOpenRoll?.(roll.id, roll.username)}
        className={`mx-auto mt-2.5 flex h-19 w-19 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-linear-to-br from-(--surface-raised) to-(--bg) p-1.5 shadow-[0_0_28px_color-mix(in_srgb,var(--accent)_22%,transparent)] sm:mt-3 sm:h-24 sm:w-24 sm:p-2 ${rarityRing(rarity)} ${
          clickable
            ? 'cursor-pointer transition hover:scale-[1.03] active:scale-[0.98]'
            : ''
        }`}
        title={clickable ? 'Open roll' : undefined}
      >
        <span
          className={`mono-number max-w-full truncate text-center font-bold leading-none tracking-tight text-(--prose) ${tileFont}`}
        >
          {display}
        </span>
      </button>

      <p className="mt-2.5 truncate text-xs text-(--prose-2) sm:text-sm">
        by{' '}
        {roll.username && onOpenProfile ? (
          <button
            type="button"
            className="font-semibold text-(--accent) underline-offset-2 hover:underline"
            onClick={() => onOpenProfile(roll.username!)}
          >
            {roll.username}
          </button>
        ) : (
          <span className="font-semibold text-(--prose)">
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
            <span className="rounded-full border border-(--outline) bg-(--bg) px-1.5 py-0.5 text-[10px] font-semibold text-(--prose-2)">
              +{extra}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-2.5">
        <p className="mono-number text-sm font-bold text-red-600 dark:text-red-400 sm:text-base">
          {roll.totalEP.toLocaleString()} EP
        </p>
        <p className="mt-0.5 text-[10px] text-(--prose-3) sm:text-[11px]">
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
