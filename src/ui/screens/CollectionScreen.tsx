import { useMemo, useState } from 'react';
import {
  JOURNEY_BADGES,
  NUMBER_BADGES,
  type BadgeFamily,
} from '../../game';
import { useGame } from '../../state/GameProvider';

const FAMILIES: { id: BadgeFamily | 'all' | 'journey'; label: string }[] = [
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
];

/** Spoiler-safe locked blurb by family (feature 7). */
const FAMILY_HINT: Record<BadgeFamily, string> = {
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

/** Badge encyclopedia — locked vs unlocked with spoiler-safe copy. */
export function CollectionScreen() {
  const { collection } = useGame();
  const unlocked = useMemo(
    () => new Set(collection.map((c) => c.badgeId)),
    [collection],
  );
  const [filter, setFilter] = useState<(typeof FAMILIES)[number]['id']>('all');
  const [showLocked, setShowLocked] = useState(true);

  const numberUnlocked = NUMBER_BADGES.filter((b) => unlocked.has(b.id)).length;
  const journeyUnlocked = JOURNEY_BADGES.filter((b) =>
    unlocked.has(b.id),
  ).length;

  const numberList = useMemo(() => {
    let list = NUMBER_BADGES;
    if (filter !== 'all' && filter !== 'journey') {
      list = list.filter((b) => b.family === filter);
    }
    if (filter === 'journey') list = [];
    if (!showLocked) list = list.filter((b) => unlocked.has(b.id));
    return list;
  }, [filter, showLocked, unlocked]);

  const journeyList = useMemo(() => {
    if (filter !== 'all' && filter !== 'journey') return [];
    let list = [...JOURNEY_BADGES];
    if (!showLocked) list = list.filter((b) => unlocked.has(b.id));
    return list;
  }, [filter, showLocked, unlocked]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">
          Badge codex
        </h1>
        <p className="text-xs text-[var(--prose-3)]">
          Number: {numberUnlocked}/{NUMBER_BADGES.length} · Journey:{' '}
          {journeyUnlocked}/{JOURNEY_BADGES.length}
        </p>
        <p className="mt-1 text-xs text-[var(--prose-3)]">
          Locked entries stay spoiler-safe — no exact triggers until unlocked.
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
                ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
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

      {numberList.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--prose-2)]">
            Number badges
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {numberList.map((b) => {
              const has = unlocked.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded border border-[var(--outline)] p-3 text-left text-xs ${
                    has ? 'bg-[var(--surface)]' : 'bg-[var(--bg)] opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold uppercase tracking-wide">
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
                    {has ? b.description : FAMILY_HINT[b.family]}
                  </p>
                  <div className="mt-1 text-[var(--prose-3)]">
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
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--prose-2)]">
            Journey
          </h2>
          <p className="mb-2 text-xs text-[var(--prose-3)]">
            Lifetime-only EP — does not change a single roll&apos;s rarity.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {journeyList.map((b) => {
              const has = unlocked.has(b.id);
              return (
                <article
                  key={b.id}
                  className={`rounded border border-[var(--outline)] p-3 text-left text-xs ${
                    has ? 'bg-[var(--surface)]' : 'opacity-70'
                  }`}
                >
                  <div className="font-bold uppercase tracking-wide">
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
                  <div className="mt-1 text-[var(--prose-3)]">
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

      {numberList.length === 0 && journeyList.length === 0 && (
        <p className="text-sm text-[var(--prose-3)]">
          Nothing in this filter — unlock badges or show locked entries.
        </p>
      )}
    </div>
  );
}
