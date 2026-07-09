import { useCallback, useEffect, useRef, useState } from 'react';
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

const MAX_PILLS = 4;
const POLL_MS = 90_000;
const CACHE_TTL_MS = 120_000;

/** Soft session cache so remount / tab focus doesn't flash empty on a slow fetch. */
let highlightsCache: { data: HighlightsPayload; at: number } | null = null;

export function CommunityHighlights({
  onOpenProfile,
  onOpenRoll,
}: {
  onOpenProfile?: (username: string) => void;
  onOpenRoll?: (id: string, username?: string | null) => void;
} = {}) {
  const [data, setData] = useState<HighlightsPayload | null>(
    () =>
      highlightsCache && Date.now() - highlightsCache.at < CACHE_TTL_MS
        ? highlightsCache.data
        : null,
  );
  const [error, setError] = useState<string | null>(null);
  const fetchGen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(Boolean(data));
  hasDataRef.current = Boolean(data);
  const retryTimer = useRef<number | null>(null);

  const load = useCallback(async (reason: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++fetchGen.current;

    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(
        `/api/highlights?tzOffset=${encodeURIComponent(String(tzOffset))}`,
        { signal: ac.signal, credentials: 'same-origin' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HighlightsPayload;

      // Stale response (newer fetch started, or unmounted cleanup aborted us)
      if (gen !== fetchGen.current || ac.signal.aborted) return;

      highlightsCache = { data: json, at: Date.now() };
      setData(json);
      setError(null);
      log.debug('loaded', {
        reason,
        today: json.today?.number,
        week: json.week?.number,
      });
    } catch (e) {
      if (ac.signal.aborted || gen !== fetchGen.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg === 'AbortError' ||
        (e instanceof DOMException && e.name === 'AbortError')
      ) {
        return;
      }
      log.warn('fetch failed', { reason, err: msg });
      // Keep last good board if we have one — only hard-error when empty
      if (!hasDataRef.current && !highlightsCache?.data) {
        setError('Could not load community highlights');
      }
      // Soft retry once after a beat (covers cold-start / rate-limit blips)
      if (reason !== 'retry') {
        if (retryTimer.current != null) window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(() => {
          retryTimer.current = null;
          if (gen === fetchGen.current) void load('retry');
        }, 1_200);
      }
    }
  }, []);

  useEffect(() => {
    void load('mount');
    const t = window.setInterval(() => void load('poll'), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void load('visible');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      fetchGen.current += 1;
      abortRef.current?.abort();
      if (retryTimer.current != null) window.clearTimeout(retryTimer.current);
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
          No Ranked rolls on the board yet
        </p>
        <p className="mt-1 text-xs text-[var(--prose-3)]">
          Sign in, claim @username, and use Ranked free play — only server rolls
          claim today&apos;s / this week&apos;s crowns.
        </p>
      </div>
    );
  }

  const both = Boolean(data.today && data.week);

  return (
    <div
      className={`grid w-full max-w-2xl gap-3 ${
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
  const rarity = asRarity(roll.rarity);
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
