import { useCallback, useEffect, useState } from 'react';
import type { RarityTier } from '../../game';
import { createLogger } from '../../lib/logger';
import { BadgePill, type BadgePillData } from './BadgePill';
import { RarityBadge } from './RarityBadge';

const log = createLogger('highlights');

export type HighlightRoll = {
  id: string;
  shortCode: string | null;
  number: number;
  totalEP: number;
  rarity: string;
  username: string | null;
  badgeCount: number;
  topBadges: BadgePillData[];
  rolledAt: string;
};

type HighlightsPayload = {
  today: HighlightRoll | null;
  week: HighlightRoll | null;
  todayRollCount: number;
  weekRollCount: number;
};

const MAX_PILLS = 7;

export function CommunityHighlights({
  onOpenProfile,
  onOpenRoll,
}: {
  onOpenProfile?: (username: string) => void;
  onOpenRoll?: (id: string, username?: string | null) => void;
} = {}) {
  const [data, setData] = useState<HighlightsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(
        `/api/highlights?tzOffset=${encodeURIComponent(String(tzOffset))}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HighlightsPayload;
      setData(json);
      setError(null);
      log.debug('loaded', {
        today: json.today?.number,
        week: json.week?.number,
      });
    } catch (e) {
      log.warn('fetch failed', {
        err: e instanceof Error ? e.message : String(e),
      });
      setError('Could not load community highlights');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 90_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  if (error && !data) {
    return (
      <p className="text-center text-xs text-[var(--prose-3)]">{error}</p>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-xs text-[var(--prose-3)]">
        Loading community rolls…
      </p>
    );
  }

  const empty = !data.today && !data.week;
  if (empty) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-[var(--outline)] bg-[var(--surface)]/60 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-[var(--prose-2)]">
          No public rolls yet today
        </p>
        <p className="mt-1 text-xs text-[var(--prose-3)]">
          Sign in, roll, and sync — the first cloud roll can claim the board.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {data.today && (
        <HighlightCard
          label="Today's best roll"
          roll={data.today}
          footer={`${data.todayRollCount.toLocaleString()} roll${data.todayRollCount === 1 ? '' : 's'} today`}
          onOpenProfile={onOpenProfile}
          onOpenRoll={onOpenRoll}
        />
      )}
      {data.week && (
        <HighlightCard
          label="Best weekly roll"
          roll={data.week}
          footer={`${data.weekRollCount.toLocaleString()} roll${data.weekRollCount === 1 ? '' : 's'} this week`}
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
  const rarity = asRarity(roll.rarity);
  const pills = roll.topBadges.slice(0, MAX_PILLS);
  const extra = Math.max(0, roll.badgeCount - pills.length);
  const clickable = Boolean(onOpenRoll);

  return (
    <section className="w-full overflow-hidden rounded-xl border border-[var(--outline)] bg-[var(--surface)] px-4 py-4 text-center shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--prose-3)]">
        {label}
      </p>

      <button
        type="button"
        disabled={!clickable}
        onClick={() => onOpenRoll?.(roll.id, roll.username)}
        className={`mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-2xl border-2 bg-gradient-to-br from-[var(--surface-raised)] to-[var(--bg)] shadow-[0_0_28px_color-mix(in_srgb,var(--accent)_22%,transparent)] ${rarityRing(rarity)} ${
          clickable
            ? 'cursor-pointer transition hover:scale-[1.03] active:scale-[0.98]'
            : ''
        }`}
        title={clickable ? 'Open roll' : undefined}
      >
        <span className="mono-number text-3xl font-bold tracking-tight text-[var(--prose)]">
          {formatHighlightNumber(roll.number)}
        </span>
      </button>

      <p className="mt-3 text-sm text-[var(--prose-2)]">
        rolled by{' '}
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

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <RarityBadge rarity={rarity} />
      </div>

      {pills.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {pills.map((b, i) => (
            <BadgePill key={`${b.name}-${i}`} badge={b} compact />
          ))}
          {extra > 0 && (
            <span className="rounded-full border border-[var(--outline)] bg-[var(--bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--prose-2)]">
              +{extra} more
            </span>
          )}
        </div>
      )}

      <p className="mt-3 mono-number text-base font-bold text-red-600 dark:text-red-400">
        {roll.totalEP.toLocaleString()} EP
      </p>
      <p className="mt-1 text-[11px] text-[var(--prose-3)]">{footer}</p>
    </section>
  );
}

function formatHighlightNumber(n: number): string {
  if (n >= 1_000_000) return n.toLocaleString();
  return String(n);
}

function asRarity(r: string): RarityTier {
  const ok: RarityTier[] = [
    'trash',
    'common',
    'uncommon',
    'rare',
    'epic',
    'anomaly',
    'mythic',
  ];
  return (ok.includes(r as RarityTier) ? r : 'common') as RarityTier;
}

function rarityRing(r: RarityTier): string {
  switch (r) {
    case 'mythic':
      return 'border-amber-400/70';
    case 'anomaly':
      return 'border-fuchsia-400/70';
    case 'epic':
      return 'border-violet-400/60';
    case 'rare':
      return 'border-blue-400/55';
    case 'uncommon':
      return 'border-teal-400/50';
    default:
      return 'border-[var(--outline)]';
  }
}
