import { useEffect, useState } from 'react';
import {
  contributeKeyEntropy,
  contributePointerEntropy,
  topPercentFromPercentile,
} from '../../game';
import { useGame } from '../../state/GameProvider';
import { BadgePill } from '../components/BadgePill';
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
  /** Value fed to the slot display — updated only with revealKey to avoid snap race. */
  const [slotValue, setSlotValue] = useState<number | null>(
    () => lastRoll?.number ?? null,
  );
  const [revealKey, setRevealKey] = useState(0);
  const [revealDone, setRevealDone] = useState(() => lastRoll != null);

  // Keep slot in sync for non-animated loads (refresh with history)
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
    // Batch value + reveal key so digits never snap before spinning
    setSlotValue(outcome.roll.number);
    setRevealKey((k) => k + 1);
  };

  const busy = rolling || (revealKey > 0 && !revealDone);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="max-w-sm text-sm text-[var(--prose-3)]">
        Unlimited rolls. No daily lock. Fortified browser CSPRNG.
      </p>

      <NumberDisplay
        value={slotValue}
        rarity={revealDone ? lastRoll?.rarity : undefined}
        revealKey={revealKey}
        onRevealComplete={() => setRevealDone(true)}
      />

      {lastRoll && revealDone && (
        <div className="number-fade-in flex flex-col items-center gap-2">
          <RarityBadge rarity={lastRoll.rarity} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <EPPill ep={lastRoll.totalEP} />
            <span className="text-xs text-[var(--prose-3)]">
              Top {topPercentFromPercentile(lastRoll.percentile)}% of roll scores
            </span>
          </div>
          <div className="mt-2 flex max-w-lg flex-wrap justify-center gap-1.5">
            {lastRoll.badges.length === 0 ? (
              <span className="text-xs text-[var(--prose-3)]">No number badges</span>
            ) : (
              lastRoll.badges.map((b) => <BadgePill key={b.id} badge={b} />)
            )}
          </div>
        </div>
      )}

      {lastRoll && !revealDone && (
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--prose-3)]">
          Rolling…
        </p>
      )}

      {revealDone && lastJourneyUnlocks.length > 0 && (
        <div className="number-fade-in rounded border border-[var(--accent)] bg-[var(--surface-raised)] px-3 py-2 text-sm">
          Journey unlocked:{' '}
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
