import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  JOURNEY_BADGES,
  LIFETIME_EP_BADGES,
  NUMBER_BADGES,
  SECTION_SECRETS,
  SECRET_BADGES,
  sectionProgress,
  type BadgeFamily,
  type SecretBadgeDef,
} from '../../game';
import { formatDateTimeMedium, formatRelative } from '../../lib/format';
import { FAMILY_ICON } from '../../lib/icons';
import { useGame } from '../../state/GameProvider';
import {
  BadgeArtLightbox,
  type BadgeArtLightboxItem,
} from '../components/BadgeArtLightbox';
import { FormattedCount } from '../components/FormattedCount';
import { MotionCard } from '../motion';
import { MOTION_EASE, MOTION_MS } from '../motion/tokens';

type FilterId = BadgeFamily | 'all' | 'secret' | 'new';

/** Window for Codex “NEW” filter — badges first earned in this span. */
const NEW_WINDOW_MS = 5 * 60 * 1000;

const FAMILIES: { id: FilterId; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'all', label: 'All' },
  { id: 'math', label: 'Math' },
  { id: 'pattern', label: 'Pattern' },
  { id: 'void', label: 'Void' },
  { id: 'cultural', label: 'Culture' },
  { id: 'magnitude', label: 'Size' },
  { id: 'sequence', label: 'Seq' },
  { id: 'poker', label: 'Poker' },
  { id: 'element', label: 'Element' },
  { id: 'atomic-registry', label: 'Atomic' },
  { id: 'bases', label: 'Bases' },
  { id: 'years', label: 'Years' },
  { id: 'journey', label: 'Journey' },
  { id: 'lifetime', label: 'Lifetime EP' },
  { id: 'secret', label: 'Secret' },
];

const FAMILY_HINT: Record<Exclude<BadgeFamily, 'secret'>, string> = {
  math: 'A mathematical property hides here.',
  pattern: 'A digit pattern waits to be found.',
  void: 'Something sparse or empty…',
  cultural: 'A number with a story.',
  magnitude: 'About how large (or small) the roll is.',
  sequence: 'Order and runs of digits.',
  poker: 'Hand-like digit combinations.',
  element: 'Periodic-table vibes.',
  'atomic-registry': 'Full periodic table · last three digits.',
  bases: 'A numeral-base pattern hides here.',
  years: 'An era bucket — centuries and decades.',
  journey: 'Lifetime milestone — keep rolling.',
  lifetime: 'Lifetime EP milestone — keep earning.',
};

const CEILING_LOCKED_TITLE = 'Ultra-rare seal';
const CEILING_LOCKED_BODY = 'Hit exactly 1,000,000 to claim this seal.';
const SECRET_LOCKED_TITLE = 'Hidden mastery';
const SECRET_LOCKED_BODY =
  'Collect every badge in this codex section to reveal the seal.';
const OMEGA_LOCKED_TITLE = '???? · ????';
const OMEGA_LOCKED_BODY =
  'Unlock every number badge, every journey mark, every lifetime EP seal, and every section mastery. Then this appears.';

function isRecentUnlock(iso: string | undefined, now: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const age = now - t;
  return age >= 0 && age <= NEW_WINDOW_MS;
}

/** Case-insensitive substring match against one or more haystacks. */
function textMatchesQuery(query: string, ...parts: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => p.toLowerCase().includes(q));
}

/**
 * Spoiler-safe codex search: unlocked badges match real name/description;
 * locked badges match only the visible placeholder copy (never true name/desc).
 */
function badgeMatchesQuery(
  isUnlocked: boolean,
  query: string,
  unlocked: { name: string; description: string },
  lockedHaystack: string[],
): boolean {
  const q = query.trim();
  if (!q) return true;
  if (isUnlocked) {
    return textMatchesQuery(q, unlocked.name, unlocked.description);
  }
  return textMatchesQuery(q, ...lockedHaystack);
}

function numberLockedHaystack(b: {
  family: BadgeFamily;
  image?: string;
}): string[] {
  if (b.image) {
    return [CEILING_LOCKED_TITLE, CEILING_LOCKED_BODY, 'Locked'];
  }
  const hint =
    FAMILY_HINT[b.family as Exclude<BadgeFamily, 'secret'>] ?? 'Locked';
  return ['????', hint, 'Locked'];
}

function journeyLockedHaystack(): string[] {
  return ['????', FAMILY_HINT.journey, 'Locked milestone'];
}

function lifetimeLockedHaystack(): string[] {
  return ['????', FAMILY_HINT.lifetime, 'Locked milestone'];
}

function secretLockedHaystack(secret: SecretBadgeDef): string[] {
  if (secret.tier === 'omega') {
    return [OMEGA_LOCKED_TITLE, OMEGA_LOCKED_BODY, 'Final seal'];
  }
  if (secret.tier === 'streak') {
    return ['????', 'Hit a streak or giant window', 'Locked'];
  }
  return [SECRET_LOCKED_TITLE, SECRET_LOCKED_BODY];
}

/** Badge encyclopedia — locked vs unlocked with spoiler-safe copy + secret tab. */
export function CollectionScreen() {
  const { collection } = useGame();
  const unlocked = useMemo(
    () => new Set(collection.map((c) => c.badgeId)),
    [collection],
  );
  const unlockedAt = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of collection) {
      if (e.badgeId && e.firstEarnedAt) map.set(e.badgeId, e.firstEarnedAt);
    }
    return map;
  }, [collection]);
  const [filter, setFilter] = useState<FilterId>('all');
  const reduceMotion = useReducedMotion();
  const [showLocked, setShowLocked] = useState(true);
  const [query, setQuery] = useState('');
  const [lightbox, setLightbox] = useState<BadgeArtLightboxItem | null>(null);
  /** Tick so the 5-minute NEW window expires without a remount. */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const recentIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of collection) {
      if (isRecentUnlock(e.firstEarnedAt, now)) set.add(e.badgeId);
    }
    return set;
  }, [collection, now]);

  const numberUnlocked = NUMBER_BADGES.filter((b) => unlocked.has(b.id)).length;
  const journeyUnlocked = JOURNEY_BADGES.filter((b) =>
    unlocked.has(b.id),
  ).length;
  const lifetimeUnlocked = LIFETIME_EP_BADGES.filter((b) =>
    unlocked.has(b.id),
  ).length;
  const secretUnlocked = SECRET_BADGES.filter((b) => unlocked.has(b.id)).length;

  const numberList = useMemo(() => {
    if (filter === 'journey' || filter === 'lifetime' || filter === 'secret')
      return [];
    let list = NUMBER_BADGES;
    if (filter === 'new') {
      list = list
        .filter((b) => recentIds.has(b.id))
        .sort(
          (a, b) =>
            Date.parse(unlockedAt.get(b.id) ?? '') -
            Date.parse(unlockedAt.get(a.id) ?? ''),
        );
    } else if (filter !== 'all') {
      list = list.filter((b) => b.family === filter);
    }
    if (filter !== 'new' && !showLocked) {
      list = list.filter((b) => unlocked.has(b.id));
    }
    if (query.trim()) {
      list = list.filter((b) =>
        badgeMatchesQuery(
          unlocked.has(b.id),
          query,
          { name: b.name, description: b.description },
          numberLockedHaystack(b),
        ),
      );
    }
    return list;
  }, [filter, showLocked, unlocked, recentIds, unlockedAt, query]);

  const journeyList = useMemo(() => {
    if (
      filter === 'secret' ||
      filter === 'lifetime' ||
      (filter !== 'all' && filter !== 'journey' && filter !== 'new')
    ) {
      return [];
    }
    let list = [...JOURNEY_BADGES];
    if (filter === 'new') {
      list = list
        .filter((b) => recentIds.has(b.id))
        .sort(
          (a, b) =>
            Date.parse(unlockedAt.get(b.id) ?? '') -
            Date.parse(unlockedAt.get(a.id) ?? ''),
        );
    } else if (!showLocked) {
      list = list.filter((b) => unlocked.has(b.id));
    }
    if (query.trim()) {
      list = list.filter((b) =>
        badgeMatchesQuery(
          unlocked.has(b.id),
          query,
          { name: b.name, description: b.description },
          journeyLockedHaystack(),
        ),
      );
    }
    return list;
  }, [filter, showLocked, unlocked, recentIds, unlockedAt, query]);

  const lifetimeList = useMemo(() => {
    if (
      filter === 'secret' ||
      filter === 'journey' ||
      (filter !== 'all' && filter !== 'lifetime' && filter !== 'new')
    ) {
      return [];
    }
    let list = [...LIFETIME_EP_BADGES];
    if (filter === 'new') {
      list = list
        .filter((b) => recentIds.has(b.id))
        .sort(
          (a, b) =>
            Date.parse(unlockedAt.get(b.id) ?? '') -
            Date.parse(unlockedAt.get(a.id) ?? ''),
        );
    } else if (!showLocked) {
      list = list.filter((b) => unlocked.has(b.id));
    }
    if (query.trim()) {
      list = list.filter((b) =>
        badgeMatchesQuery(
          unlocked.has(b.id),
          query,
          { name: b.name, description: b.description },
          lifetimeLockedHaystack(),
        ),
      );
    }
    return list;
  }, [filter, showLocked, unlocked, recentIds, unlockedAt, query]);

  const secretList = useMemo(() => {
    if (
      filter === 'journey' ||
      filter === 'lifetime' ||
      (filter !== 'all' && filter !== 'secret' && filter !== 'new')
    ) {
      return [];
    }
    let list = [...SECRET_BADGES];
    if (filter === 'new') {
      list = list
        .filter((s) => recentIds.has(s.id))
        .sort(
          (a, b) =>
            Date.parse(unlockedAt.get(b.id) ?? '') -
            Date.parse(unlockedAt.get(a.id) ?? ''),
        );
    } else if (!showLocked) {
      list = list.filter((b) => unlocked.has(b.id));
    }
    if (query.trim()) {
      list = list.filter((s) =>
        badgeMatchesQuery(
          unlocked.has(s.id),
          query,
          { name: s.name, description: s.description },
          secretLockedHaystack(s),
        ),
      );
    }
    return list;
  }, [filter, showLocked, unlocked, recentIds, unlockedAt, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Badge codex</h1>
        <p className="text-sm text-(--prose-2)">
          Number: {numberUnlocked}/{NUMBER_BADGES.length} · Journey:{' '}
          {journeyUnlocked}/{JOURNEY_BADGES.length} · Lifetime EP:{' '}
          {lifetimeUnlocked}/{LIFETIME_EP_BADGES.length} · Secrets:{' '}
          {secretUnlocked}/{SECRET_BADGES.length}
        </p>
        <p className="mt-1 text-sm text-(--prose-2)">
          Complete every badge in a section to unlock a Secret mastery. Finish
          all sections for the final Codex Absolute.
        </p>
      </div>

      <div className="relative">
        <label className="block text-sm">
          <span className="sr-only">Search badges</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search badges…"
            autoComplete="off"
            className="w-full rounded-lg border border-(--outline) bg-(--bg) px-3 py-2 pr-10 text-sm"
          />
        </label>
        {query.trim() !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded text-sm font-semibold text-(--prose-3) hover:text-(--prose)"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FAMILIES.map((f) => {
          const icon = f.id === 'new' ? null : FAMILY_ICON[f.id];
          const isNewTab = f.id === 'new';
          const selected = filter === f.id;
          return (
            <motion.button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative box-border inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-sm font-semibold ${
                isNewTab || f.id === 'all' ? '' : 'min-w-[7.25rem] '
              }${
                selected
                  ? isNewTab
                    ? 'border-amber-400 text-black'
                    : f.id === 'secret'
                      ? 'border-amber-400 text-black'
                      : 'border-(--accent) text-(--bg)'
                  : isNewTab
                    ? 'border-amber-500/50 text-amber-700 dark:text-amber-300'
                    : f.id === 'secret'
                      ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'border-(--outline) text-(--prose-2)'
              }`}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: MOTION_MS.quick / 1000, ease: MOTION_EASE }
              }
            >
              {selected && (
                <motion.span
                  layoutId={reduceMotion ? undefined : 'collection-filter-pill'}
                  className={`absolute inset-0 rounded-md ${
                    isNewTab || f.id === 'secret'
                      ? 'bg-amber-400'
                      : 'bg-(--accent)'
                  }`}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          duration: MOTION_MS.standard / 1000,
                          ease: MOTION_EASE,
                        }
                  }
                />
              )}
              <span className="relative z-1 inline-flex items-center justify-center gap-1.5">
                {isNewTab ? (
                  <span
                    className={`rounded px-1 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      selected
                        ? 'bg-black/15 text-black'
                        : 'bg-amber-400 text-black'
                    }`}
                  >
                    New
                  </span>
                ) : (
                  <>
                    {icon && (
                      <span className="icon-chip h-5 w-5 ring-1 ring-black/15 dark:ring-white/10">
                        <img src={icon} alt="" aria-hidden />
                      </span>
                    )}
                    {f.label}
                  </>
                )}
                {isNewTab && recentIds.size > 0 && (
                  <span
                    className={`ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                      selected
                        ? 'bg-black/20 text-black'
                        : 'bg-amber-400/25 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {recentIds.size}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowLocked((v) => !v)}
          className={`box-border h-9 shrink-0 rounded-md border border-(--outline) px-2.5 text-sm font-semibold text-(--prose-2) ${
            filter === 'new' ? 'invisible pointer-events-none' : ''
          }`}
          aria-hidden={filter === 'new'}
          tabIndex={filter === 'new' ? -1 : undefined}
        >
          {showLocked ? 'Hide locked' : 'Show locked'}
        </button>
      </div>

      {filter === 'new' && (
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-(--prose-2)">
          First-time unlocks from the last{' '}
          <span className="font-semibold text-amber-800 dark:text-amber-300">
            5 minutes
          </span>
          {recentIds.size > 0
            ? ` · ${recentIds.size} badge${recentIds.size === 1 ? '' : 's'} right now`
            : ' · nothing new yet — go roll!'}
          . Entries drop off when they age out.
        </p>
      )}

      {filter === 'secret' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-(--prose-2)">
          Secrets never appear on a single roll. They unlock only when a whole
          codex section is complete (or everything, for Codex Absolute).
        </p>
      )}

      {numberList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-(--prose)">
            {filter === 'new' ? 'New number badges' : 'Number badges'}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {numberList.map((b) => {
              const has = unlocked.has(b.id);
              const at = unlockedAt.get(b.id);
              const when = has ? formatDateTimeMedium(at) : null;
              const age = filter === 'new' ? formatRelative(at, now) : null;
              const fresh = has && recentIds.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    b.image && has
                      ? 'border-amber-400/55 bg-linear-to-br from-amber-500/15 via-violet-500/10 to-(--surface) shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                      : fresh
                        ? 'border-amber-400/45 bg-(--surface) shadow-[0_0_0_1px_rgba(251,191,36,0.08)]'
                        : has
                          ? 'border-(--outline) bg-(--surface)'
                          : 'border-(--outline) bg-(--bg) opacity-70'
                  }`}
                >
                  <div className="flex gap-3">
                    {b.image && (
                      <div
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border sm:h-20 sm:w-20 ${
                          has
                            ? 'border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                            : 'border-(--outline) grayscale'
                        }`}
                      >
                        <img
                          src={b.image}
                          alt={has ? b.name : 'Locked ultra-rare seal'}
                          className={`h-full w-full object-cover ${has ? '' : 'opacity-40 blur-[1px]'}`}
                        />
                        {!has && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-base">
                            🔒
                          </div>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold tracking-tight">
                          {has ? (
                            <>
                              {!b.image && (
                                <span className="mr-1" aria-hidden>
                                  {b.emoji}
                                </span>
                              )}
                              {b.name}
                              {fresh && (
                                <span className="ml-1.5 inline-flex rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                                  New
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="mr-1" aria-hidden>
                                🔒
                              </span>
                              {b.image ? CEILING_LOCKED_TITLE : '????'}
                            </>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-medium capitalize text-(--prose-2)">
                          {b.family}
                        </span>
                      </div>
                      <p className="mt-1 text-(--prose-2)">
                        {has
                          ? b.description
                          : b.image
                            ? CEILING_LOCKED_BODY
                            : FAMILY_HINT[
                                b.family as Exclude<BadgeFamily, 'secret'>
                              ]}
                      </p>
                      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm text-(--prose-2)">
                        <span>
                          {has ? (
                            <>
                              +<FormattedCount value={b.ep} /> EP
                            </>
                          ) : (
                            'Locked'
                          )}
                        </span>
                        {(age || when) && (
                          <time
                            dateTime={at}
                            className="text-xs text-(--prose-3)"
                            title="First unlocked"
                          >
                            {age ? `Unlocked ${age}` : `Unlocked ${when}`}
                          </time>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {journeyList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-(--prose)">
            {filter === 'new' ? 'New journey marks' : 'Journey'}
          </h2>
          {filter !== 'new' && (
            <p className="mb-2 text-sm text-(--prose-2)">
              Lifetime-only EP — does not change a single roll&apos;s rarity.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {journeyList.map((b) => {
              const has = unlocked.has(b.id);
              const at = unlockedAt.get(b.id);
              const when = has ? formatDateTimeMedium(at) : null;
              const age = filter === 'new' ? formatRelative(at, now) : null;
              const fresh = has && recentIds.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    b.image && has
                      ? 'border-amber-400/55 bg-linear-to-br from-amber-500/15 via-teal-500/10 to-(--surface) shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                      : fresh
                        ? 'border-amber-400/45 bg-(--surface)'
                        : has
                          ? 'border-(--outline) bg-(--surface)'
                          : 'border-(--outline) opacity-70'
                  }`}
                >
                  <div className="flex gap-3">
                    {b.image && (
                      <MotionCard
                        as="button"
                        hover={has}
                        press={has}
                        disabled={!has}
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border sm:h-20 sm:w-20 ${
                          has
                            ? 'cursor-pointer border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
                            : 'cursor-default border-(--outline) grayscale'
                        }`}
                        onClick={() => {
                          if (!has || !b.image) return;
                          setLightbox({
                            image: b.image,
                            name: b.name,
                            description: b.description,
                            ep: b.ep,
                            kind: 'Journey',
                            layoutId: `collection-badge-${b.id}`,
                          });
                        }}
                        aria-label={
                          has ? `View ${b.name} full size` : undefined
                        }
                      >
                        <motion.img
                          layoutId={
                            reduceMotion || !has
                              ? undefined
                              : `collection-badge-${b.id}`
                          }
                          src={b.image}
                          alt={has ? '' : 'Locked journey milestone'}
                          className={`h-full w-full object-cover ${has ? '' : 'opacity-40 blur-[1px]'}`}
                        />
                        {!has && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-base">
                            🔒
                          </div>
                        )}
                      </MotionCard>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold tracking-tight">
                        {has ? (
                          <>
                            {!b.image && (
                              <span className="mr-1" aria-hidden>
                                {b.emoji}
                              </span>
                            )}
                            {b.name}
                            {fresh && (
                              <span className="ml-1.5 inline-flex rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                                New
                              </span>
                            )}
                          </>
                        ) : (
                          '????'
                        )}
                      </div>
                      <p className="mt-1 text-(--prose-2)">
                        {has ? b.description : FAMILY_HINT.journey}
                      </p>
                      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm text-(--prose-2)">
                        <span>
                          {has ? (
                            <>
                              +<FormattedCount value={b.ep} /> life EP
                            </>
                          ) : (
                            'Locked milestone'
                          )}
                        </span>
                        {(age || when) && (
                          <time
                            dateTime={at}
                            className="text-xs text-(--prose-3)"
                            title="First unlocked"
                          >
                            {age ? `Unlocked ${age}` : `Unlocked ${when}`}
                          </time>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {lifetimeList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-(--prose)">
            {filter === 'new' ? 'New lifetime EP marks' : 'Lifetime EP'}
          </h2>
          {filter !== 'new' && (
            <p className="mb-2 text-sm text-(--prose-2)">
              Lifetime EP milestones — does not change a single roll&apos;s
              rarity.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {lifetimeList.map((b) => {
              const has = unlocked.has(b.id);
              const at = unlockedAt.get(b.id);
              const when = has ? formatDateTimeMedium(at) : null;
              const age = filter === 'new' ? formatRelative(at, now) : null;
              const fresh = has && recentIds.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    b.image && has
                      ? 'border-amber-400/55 bg-linear-to-br from-amber-500/15 via-teal-500/10 to-(--surface) shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                      : fresh
                        ? 'border-amber-400/45 bg-(--surface)'
                        : has
                          ? 'border-(--outline) bg-(--surface)'
                          : 'border-(--outline) opacity-70'
                  }`}
                >
                  <div className="flex gap-3">
                    {b.image && (
                      <MotionCard
                        as="button"
                        hover={has}
                        press={has}
                        disabled={!has}
                        className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border sm:h-20 sm:w-20 ${
                          has
                            ? 'cursor-pointer border-amber-400/70 shadow-[0_0_12px_rgba(251,191,36,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
                            : 'cursor-default border-(--outline) grayscale'
                        }`}
                        onClick={() => {
                          if (!has || !b.image) return;
                          setLightbox({
                            image: b.image,
                            name: b.name,
                            description: b.description,
                            ep: b.ep,
                            kind: 'Lifetime EP',
                            layoutId: `collection-badge-${b.id}`,
                          });
                        }}
                        aria-label={
                          has ? `View ${b.name} full size` : undefined
                        }
                      >
                        <motion.img
                          layoutId={
                            reduceMotion || !has
                              ? undefined
                              : `collection-badge-${b.id}`
                          }
                          src={b.image}
                          alt={has ? '' : 'Locked lifetime EP milestone'}
                          className={`h-full w-full object-cover ${has ? '' : 'opacity-40 blur-[1px]'}`}
                        />
                        {!has && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-base">
                            🔒
                          </div>
                        )}
                      </MotionCard>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold tracking-tight">
                        {has ? (
                          <>
                            {!b.image && (
                              <span className="mr-1" aria-hidden>
                                {b.emoji}
                              </span>
                            )}
                            {b.name}
                            {fresh && (
                              <span className="ml-1.5 inline-flex rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                                New
                              </span>
                            )}
                          </>
                        ) : (
                          '????'
                        )}
                      </div>
                      <p className="mt-1 text-(--prose-2)">
                        {has ? b.description : FAMILY_HINT.lifetime}
                      </p>
                      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm text-(--prose-2)">
                        <span>
                          {has ? (
                            <>
                              +<FormattedCount value={b.ep} /> life EP
                            </>
                          ) : (
                            'Locked milestone'
                          )}
                        </span>
                        {(age || when) && (
                          <time
                            dateTime={at}
                            className="text-xs text-(--prose-3)"
                            title="First unlocked"
                          >
                            {age ? `Unlocked ${age}` : `Unlocked ${when}`}
                          </time>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {secretList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-(--prose)">
            {filter === 'new' ? 'New secret masteries' : 'Secret masteries'}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {secretList.map((s) => (
              <SecretCard
                key={s.id}
                secret={s}
                unlocked={unlocked}
                unlockedAt={unlockedAt.get(s.id)}
                isFresh={recentIds.has(s.id)}
                ageLabel={
                  filter === 'new'
                    ? formatRelative(unlockedAt.get(s.id), now)
                    : null
                }
                onOpenArt={
                  unlocked.has(s.id) && s.image
                    ? () =>
                        setLightbox({
                          image: s.image,
                          name: s.name,
                          description: s.description,
                          ep: s.ep,
                          kind:
                            s.tier === 'omega'
                              ? 'Final seal'
                              : s.tier === 'streak'
                                ? 'Streak secret'
                                : 'Secret mastery',
                          layoutId: `collection-badge-${s.id}`,
                        })
                    : undefined
                }
                artLayoutId={
                  unlocked.has(s.id) && s.image && !reduceMotion
                    ? `collection-badge-${s.id}`
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {numberList.length === 0 &&
        journeyList.length === 0 &&
        lifetimeList.length === 0 &&
        secretList.length === 0 && (
          <p className="text-sm text-(--prose-2)">
            {query.trim()
              ? `No badges match “${query.trim()}”.`
              : filter === 'new'
                ? 'No first-time unlocks in the last 5 minutes. Roll something new!'
                : 'Nothing in this filter — unlock badges or show locked entries.'}
          </p>
        )}

      {lightbox && (
        <BadgeArtLightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function SecretCard({
  secret,
  unlocked,
  unlockedAt,
  isFresh = false,
  ageLabel = null,
  onOpenArt,
  artLayoutId,
}: {
  secret: SecretBadgeDef;
  unlocked: Set<string>;
  unlockedAt?: string;
  isFresh?: boolean;
  ageLabel?: string | null;
  onOpenArt?: () => void;
  artLayoutId?: string;
}) {
  const has = unlocked.has(secret.id);
  const isOmega = secret.tier === 'omega';
  const isStreak = secret.tier === 'streak';
  const when = has ? formatDateTimeMedium(unlockedAt) : null;
  const progress =
    secret.section === 'omega'
      ? {
          have: SECTION_SECRETS.filter((s) => unlocked.has(s.id)).length,
          total: SECTION_SECRETS.length,
        }
      : secret.section === 'streak'
        ? { have: has ? 1 : 0, total: 1 }
        : sectionProgress(secret.section, unlocked);

  if (isOmega) {
    return (
      <article
        className={`relative overflow-hidden rounded-xl border-2 p-4 text-left sm:p-5 ${
          has
            ? 'border-amber-400 bg-linear-to-br from-amber-500/20 via-violet-500/15 to-teal-500/20 shadow-[0_0_40px_rgba(251,191,36,0.25)]'
            : 'border-amber-500/20 bg-(--bg) opacity-80'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <MotionCard
            as="button"
            hover={Boolean(onOpenArt)}
            press={Boolean(onOpenArt)}
            disabled={!onOpenArt}
            onClick={onOpenArt}
            aria-label={has ? `View ${secret.name} full size` : undefined}
            className={`relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-xl border-2 sm:mx-0 sm:h-32 sm:w-32 ${
              has
                ? 'cursor-pointer border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
                : 'cursor-default border-(--outline) grayscale'
            }`}
          >
            <motion.img
              layoutId={artLayoutId}
              src={secret.image}
              alt={has ? '' : 'Locked final seal'}
              className={`h-full w-full object-cover ${has ? '' : 'opacity-40 blur-[1px]'}`}
            />
            {!has && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-2xl">
                🔒
              </div>
            )}
          </MotionCard>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
              Final seal
            </p>
            <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {has ? secret.name : OMEGA_LOCKED_TITLE}
              {isFresh && has && (
                <span className="ml-2 inline-flex rounded bg-amber-400 px-1.5 py-0.5 align-middle text-[10px] font-black uppercase tracking-wider text-black">
                  New
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-(--prose-2)">
              {has ? secret.description : OMEGA_LOCKED_BODY}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {has ? (
                  <>
                    +<FormattedCount value={secret.ep} /> life EP
                  </>
                ) : (
                  `${progress.have}/${progress.total} section secrets`
                )}
              </span>
              {(ageLabel || when) && (
                <time
                  dateTime={unlockedAt}
                  className="text-xs text-(--prose-3)"
                  title="First unlocked"
                >
                  {ageLabel ? `Unlocked ${ageLabel}` : `Unlocked ${when}`}
                </time>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`flex gap-3 rounded-xl border p-3 text-left sm:p-4 ${
        isFresh && has
          ? 'border-amber-400/50 bg-linear-to-br from-amber-500/10 via-violet-500/10 to-transparent shadow-sm'
          : has
            ? 'border-violet-400/50 bg-linear-to-br from-violet-500/10 to-transparent shadow-sm'
            : 'border-(--outline) bg-(--surface) opacity-75'
      }`}
    >
      <MotionCard
        as="button"
        hover={Boolean(onOpenArt)}
        press={Boolean(onOpenArt)}
        disabled={!onOpenArt}
        onClick={onOpenArt}
        aria-label={has ? `View ${secret.name} full size` : undefined}
        className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border sm:h-24 sm:w-24 ${
          has
            ? 'cursor-pointer border-violet-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400'
            : 'cursor-default border-(--outline) grayscale'
        }`}
      >
        <motion.img
          layoutId={artLayoutId}
          src={secret.image}
          alt={has ? '' : 'Locked section mastery'}
          className={`h-full w-full object-cover ${has ? '' : 'opacity-35 blur-[1px]'}`}
        />
        {!has && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-lg">
            🔒
          </div>
        )}
      </MotionCard>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          {isStreak ? 'Streak secret' : `Section mastery · ${secret.section}`}
        </p>
        <div className="mt-0.5 text-lg font-bold tracking-tight">
          {has ? secret.name : isStreak ? '????' : SECRET_LOCKED_TITLE}
          {isFresh && has && (
            <span className="ml-2 inline-flex rounded bg-amber-400 px-1.5 py-0.5 align-middle text-[10px] font-black uppercase tracking-wider text-black">
              New
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-(--prose-2)">
          {has
            ? secret.description
            : isStreak
              ? 'Hit a streak or giant window.'
              : SECRET_LOCKED_BODY}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-(--prose)">
            {has ? (
              <>
                +<FormattedCount value={secret.ep} /> life EP
              </>
            ) : isStreak ? (
              'Locked'
            ) : (
              `${progress.have} / ${progress.total} badges`
            )}
          </span>
          {(ageLabel || when) && (
            <time
              dateTime={unlockedAt}
              className="text-xs text-(--prose-3)"
              title="First unlocked"
            >
              {ageLabel ? `Unlocked ${ageLabel}` : `Unlocked ${when}`}
            </time>
          )}
          {!has && !isStreak && progress.total > 0 && (
            <div className="h-2 min-w-20 flex-1 overflow-hidden rounded-full bg-(--surface-raised)">
              <div
                className="h-full rounded-full bg-violet-500/70"
                style={{
                  width: `${Math.round((progress.have / progress.total) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
