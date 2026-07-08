import { JOURNEY_BADGES, NUMBER_BADGES } from '../../game';
import { useGame } from '../../state/GameProvider';

export function CollectionScreen() {
  const { collection } = useGame();
  const unlocked = new Set(collection.map((c) => c.badgeId));

  const numberUnlocked = NUMBER_BADGES.filter((b) => unlocked.has(b.id)).length;
  const journeyUnlocked = JOURNEY_BADGES.filter((b) => unlocked.has(b.id)).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">Collection</h1>
        <p className="text-xs text-[var(--prose-3)]">
          Number badges: {numberUnlocked}/{NUMBER_BADGES.length} · Journey:{' '}
          {journeyUnlocked}/{JOURNEY_BADGES.length}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--prose-2)]">
          Number
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NUMBER_BADGES.map((b) => {
            const has = unlocked.has(b.id);
            return (
              <div
                key={b.id}
                className={`rounded border border-[var(--outline)] p-2 text-left text-xs ${
                  has ? 'bg-[var(--surface)]' : 'opacity-40'
                }`}
                title={b.description}
              >
                <div className="font-bold uppercase tracking-wide">
                  {has ? b.name : '????'}
                </div>
                <div className="text-[var(--prose-3)]">
                  {has ? `+${b.ep.toLocaleString()} EP` : 'Locked'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--prose-2)]">
          Journey
        </h2>
        <p className="mb-2 text-xs text-[var(--prose-3)]">
          Lifetime-only EP — does not change a single roll&apos;s rarity.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {JOURNEY_BADGES.map((b) => {
            const has = unlocked.has(b.id);
            return (
              <div
                key={b.id}
                className={`rounded border border-[var(--outline)] p-2 text-left text-xs ${
                  has ? 'bg-[var(--surface)]' : 'opacity-40'
                }`}
              >
                <div className="font-bold uppercase tracking-wide">
                  {has ? b.name : '????'}
                </div>
                <div className="text-[var(--prose-3)]">
                  {has ? `+${b.ep.toLocaleString()} life EP` : b.description}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
