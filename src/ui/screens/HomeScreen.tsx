import { useEffect, useState } from 'react';
import {
  contributeKeyEntropy,
  contributePointerEntropy,
  topPercentFromPercentile,
} from '../../game';
import { useGame } from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { EPPill } from '../components/EPPill';
import { GenerateButton } from '../components/GenerateButton';
import { NumberDisplay } from '../components/NumberDisplay';
import { RarityBadge } from '../components/RarityBadge';
import { SharePanel } from '../components/ShareCard';

export function HomeScreen() {
  const {
    lastRoll,
    rolling,
    roll,
    saveError,
    lastJourneyUnlocks,
    lifetimeRollCount,
    settings,
  } = useGame();
  const [shareOpen, setShareOpen] = useState(false);
  const [slotValue, setSlotValue] = useState<number | null>(
    () => lastRoll?.number ?? null,
  );
  const [revealKey, setRevealKey] = useState(0);
  const [revealDone, setRevealDone] = useState(() => lastRoll != null);

  useEffect(() => {
    if (revealKey === 0 && lastRoll != null && slotValue == null) {
      setSlotValue(lastRoll.number);
      setRevealDone(true);
    }
  }, [lastRoll, revealKey, slotValue]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      contributePointerEntropy(e.clientX, e.clientY, performance.now());
    };
    const onKey = (e: KeyboardEvent) => {
      contributeKeyEntropy(e.keyCode || e.key.charCodeAt(0) || 0, performance.now());
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleRoll = async () => {
    setRevealDone(false);
    const outcome = await roll();
    if (!outcome) {
      setRevealDone(true);
      return;
    }
    setSlotValue(outcome.roll.number);
    setRevealKey((k) => k + 1);
  };

  const busy = rolling || (revealKey > 0 && !revealDone);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Fixed action column — button never jumps when badges load */}
      <div className="flex shrink-0 flex-col items-center gap-4 text-center">
        <p className="max-w-sm text-sm text-[var(--prose-3)]">
          Unlimited rolls. No daily lock. Fortified browser CSPRNG.
        </p>

        <NumberDisplay
          value={slotValue}
          rarity={revealDone ? lastRoll?.rarity : undefined}
          revealKey={revealKey}
          onRevealComplete={() => setRevealDone(true)}
        />

        {/* Reserved score strip so layout stays stable during reveal */}
        <div className="flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5">
          {lastRoll && revealDone ? (
            <div className="number-fade-in flex flex-col items-center gap-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <RarityBadge rarity={lastRoll.rarity} />
                <span className="text-xs text-[var(--prose-3)]">
                  Top {topPercentFromPercentile(lastRoll.percentile)}%
                </span>
              </div>
              <EPPill ep={lastRoll.totalEP} />
            </div>
          ) : lastRoll && !revealDone ? (
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--prose-3)]">
              Rolling…
            </p>
          ) : (
            <p className="text-xs text-[var(--prose-3)]">Press generate to roll</p>
          )}
        </div>

        {revealDone && lastJourneyUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded border border-[var(--accent)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
            {lastJourneyUnlocks.map((j) => j.emoji).join(' ')} Journey unlocked:{' '}
            {lastJourneyUnlocks.map((j) => j.name).join(', ')} (+
            {lastJourneyUnlocks.reduce((a, b) => a + b.ep, 0).toLocaleString()}{' '}
            lifetime EP)
          </div>
        )}

        <GenerateButton
          hasRolled={!!lastRoll}
          busy={busy}
          onClick={handleRoll}
        />

        {lastRoll && revealDone && (
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-wider text-[var(--prose-2)] underline-offset-2 hover:underline"
            onClick={() => setShareOpen(true)}
          >
            Share this roll
          </button>
        )}

        {saveError && (
          <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
        )}
      </div>

      {/* Scrollable badges below the button — never shifts the CTA */}
      {lastRoll && revealDone && (
        <div className="number-fade-in mt-6 min-h-0 flex-1 overflow-y-auto pb-4">
          <BadgeBreakdown badges={lastRoll.badges} number={lastRoll.number} />
        </div>
      )}

      {shareOpen && lastRoll && (
        <SharePanel
          roll={lastRoll}
          rollCount={lifetimeRollCount}
          showRollCount={settings.shareShowRollCount}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
