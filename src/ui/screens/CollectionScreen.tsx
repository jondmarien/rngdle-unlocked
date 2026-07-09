import { useMemo, useState } from 'react';
import {
  JOURNEY_BADGES,
  NUMBER_BADGES,
  SECTION_SECRETS,
  SECRET_BADGES,
  sectionProgress,
  type BadgeFamily,
  type SecretBadgeDef,
} from '../../game';
import { useGame } from '../../state/GameProvider';

type FilterId = BadgeFamily | 'all' | 'secret';

const FAMILIES: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'math', label: 'Math' },
  { id: 'pattern', label: 'Pattern' },
  { id: 'void', label: 'Void' },
  { id: 'cultural', label: 'Culture' },
  { id: 'magnitude', label: 'Size' },
  { id: 'sequence', label: 'Seq' },
  { id: 'poker', label: 'Poker' },
  { id: 'element', label: 'Element' },
  { id: 'journey', label: 'Journey' },
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
  journey: 'Lifetime milestone — keep rolling.',
};

/** Badge encyclopedia — locked vs unlocked with spoiler-safe copy + secret tab. */
export function CollectionScreen() {
  const { collection } = useGame();
  const unlocked = useMemo(
    () => new Set(collection.map((c) => c.badgeId)),
    [collection],
  );
  const [filter, setFilter] = useState<FilterId>('all');
  const [showLocked, setShowLocked] = useState(true);

  const numberUnlocked = NUMBER_BADGES.filter((b) => unlocked.has(b.id)).length;
  const journeyUnlocked = JOURNEY_BADGES.filter((b) =>
    unlocked.has(b.id),
  ).length;
  const secretUnlocked = SECRET_BADGES.filter((b) => unlocked.has(b.id)).length;

  const numberList = useMemo(() => {
    if (filter === 'journey' || filter === 'secret') return [];
    let list = NUMBER_BADGES;
    if (filter !== 'all') {
      list = list.filter((b) => b.family === filter);
    }
    if (!showLocked) list = list.filter((b) => unlocked.has(b.id));
    return list;
  }, [filter, showLocked, unlocked]);

  const journeyList = useMemo(() => {
    if (filter !== 'all' && filter !== 'journey') return [];
    let list = [...JOURNEY_BADGES];
    if (!showLocked) list = list.filter((b) => unlocked.has(b.id));
    return list;
  }, [filter, showLocked, unlocked]);

  const secretList = useMemo(() => {
    if (filter !== 'all' && filter !== 'secret') return [];
    let list = [...SECRET_BADGES];
    if (!showLocked) list = list.filter((b) => unlocked.has(b.id));
    return list;
  }, [filter, showLocked, unlocked]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Badge codex</h1>
        <p className="text-sm text-[var(--prose-2)]">
          Number: {numberUnlocked}/{NUMBER_BADGES.length} · Journey:{' '}
          {journeyUnlocked}/{JOURNEY_BADGES.length} · Secrets:{' '}
          {secretUnlocked}/{SECRET_BADGES.length}
        </p>
        <p className="mt-1 text-sm text-[var(--prose-2)]">
          Complete every badge in a section to unlock a Secret mastery. Finish
          all sections for the final Codex Absolute.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-md border px-2.5 py-1.5 text-sm font-semibold ${
              filter === f.id
                ? f.id === 'secret'
                  ? 'border-amber-400 bg-amber-400 text-black'
                  : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                : f.id === 'secret'
                  ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'border-[var(--outline)] text-[var(--prose-2)]'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowLocked((v) => !v)}
          className="rounded-md border border-[var(--outline)] px-2.5 py-1.5 text-sm font-semibold text-[var(--prose-2)]"
        >
          {showLocked ? 'Hide locked' : 'Show locked'}
        </button>
      </div>

      {filter === 'secret' && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-[var(--prose-2)]">
          Secrets never appear on a single roll. They unlock only when a whole
          codex section is complete (or everything, for Codex Absolute).
        </p>
      )}

      {numberList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-[var(--prose)]">
            Number badges
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {numberList.map((b) => {
              const has = unlocked.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded-lg border border-[var(--outline)] p-3 text-left text-sm ${
                    has ? 'bg-[var(--surface)]' : 'bg-[var(--bg)] opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold tracking-tight">
                      {has ? (
                        <>
                          <span className="mr-1" aria-hidden>
                            {b.emoji}
                          </span>
                          {b.name}
                        </>
                      ) : (
                        <>
                          <span className="mr-1" aria-hidden>
                            🔒
                          </span>
                          ????
                        </>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-medium capitalize text-[var(--prose-2)]">
                      {b.family}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--prose-2)]">
                    {has
                      ? b.description
                      : FAMILY_HINT[b.family as Exclude<BadgeFamily, 'secret'>]}
                  </p>
                  <div className="mt-1 text-sm text-[var(--prose-2)]">
                    {has ? `+${b.ep.toLocaleString()} EP` : 'Locked'}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {journeyList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-[var(--prose)]">
            Journey
          </h2>
          <p className="mb-2 text-sm text-[var(--prose-2)]">
            Lifetime-only EP — does not change a single roll&apos;s rarity.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {journeyList.map((b) => {
              const has = unlocked.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded-lg border border-[var(--outline)] p-3 text-left text-sm ${
                    has ? 'bg-[var(--surface)]' : 'opacity-70'
                  }`}
                >
                  <div className="font-bold tracking-tight">
                    {has ? (
                      <>
                        <span className="mr-1" aria-hidden>
                          {b.emoji}
                        </span>
                        {b.name}
                      </>
                    ) : (
                      '????'
                    )}
                  </div>
                  <p className="mt-1 text-[var(--prose-2)]">
                    {has ? b.description : FAMILY_HINT.journey}
                  </p>
                  <div className="mt-1 text-sm text-[var(--prose-2)]">
                    {has
                      ? `+${b.ep.toLocaleString()} life EP`
                      : 'Locked milestone'}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {secretList.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-bold text-[var(--prose)]">
            Secret masteries
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {secretList.map((s) => (
              <SecretCard key={s.id} secret={s} unlocked={unlocked} />
            ))}
          </div>
        </section>
      )}

      {numberList.length === 0 &&
        journeyList.length === 0 &&
        secretList.length === 0 && (
          <p className="text-sm text-[var(--prose-2)]">
            Nothing in this filter — unlock badges or show locked entries.
          </p>
        )}
    </div>
  );
}

function SecretCard({
  secret,
  unlocked,
}: {
  secret: SecretBadgeDef;
  unlocked: Set<string>;
}) {
  const has = unlocked.has(secret.id);
  const isOmega = secret.tier === 'omega';
  const progress =
    secret.section !== 'omega'
      ? sectionProgress(secret.section, unlocked)
      : {
          have: SECTION_SECRETS.filter((s) => unlocked.has(s.id)).length,
          total: SECTION_SECRETS.length,
        };

  if (isOmega) {
    return (
      <article
        className={`relative overflow-hidden rounded-xl border-2 p-5 text-left ${
          has
            ? 'border-amber-400 bg-gradient-to-br from-amber-500/20 via-violet-500/15 to-teal-500/20 shadow-[0_0_40px_rgba(251,191,36,0.25)]'
            : 'border-amber-500/20 bg-[var(--bg)] opacity-80'
        }`}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
          Final seal
        </p>
        <div className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          {has ? (
            <>
              <span className="text-3xl" aria-hidden>
                {secret.emoji}
              </span>
              {secret.name}
            </>
          ) : (
            <>
              <span aria-hidden>✧</span> ???? · ????
            </>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--prose-2)]">
          {has
            ? secret.description
            : 'Unlock every number badge, every journey mark, and every section mastery. Then this appears.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-amber-800 dark:text-amber-300">
            {has
              ? `+${secret.ep.toLocaleString()} life EP`
              : `${progress.have}/${progress.total} section secrets`}
          </span>
          {!has && (
            <span className="text-[var(--prose-2)]">
              Number + journey also required
            </span>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`rounded-xl border p-4 text-left ${
        has
          ? 'border-violet-400/50 bg-gradient-to-br from-violet-500/10 to-transparent shadow-sm'
          : 'border-[var(--outline)] bg-[var(--surface)] opacity-75'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Section mastery
          </p>
          <div className="mt-0.5 text-lg font-bold tracking-tight">
            {has ? (
              <>
                <span className="mr-1" aria-hidden>
                  {secret.emoji}
                </span>
                {secret.name}
              </>
            ) : (
              <>
                <span className="mr-1" aria-hidden>
                  🔒
                </span>
                Hidden mastery
              </>
            )}
          </div>
        </div>
        <span className="rounded-full border border-violet-500/30 px-2 py-0.5 text-xs font-semibold capitalize text-violet-800 dark:text-violet-200">
          {secret.section}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--prose-2)]">
        {has
          ? secret.description
          : 'Collect every badge in this codex section to reveal the seal.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <span className="font-semibold text-[var(--prose)]">
          {has
            ? `+${secret.ep.toLocaleString()} life EP`
            : `${progress.have} / ${progress.total} badges`}
        </span>
        {!has && progress.total > 0 && (
          <div className="h-2 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
            <div
              className="h-full rounded-full bg-violet-500/70"
              style={{
                width: `${Math.round((progress.have / progress.total) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

