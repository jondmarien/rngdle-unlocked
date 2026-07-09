import { useEffect, useRef, useState } from 'react';
import {
  contributeKeyEntropy,
  contributePointerEntropy,
  topPercentFromPercentile,
} from '../../game';
import { playRollSound, shouldCelebrate } from '../../game/fx';
import { useGame, type RollMode } from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { EPPill } from '../components/EPPill';
import { GenerateButton } from '../components/GenerateButton';
import { NumberDisplay } from '../components/NumberDisplay';
import { OnboardingTip } from '../components/OnboardingTip';
import { RarityBadge } from '../components/RarityBadge';
import { SharePanel } from '../components/ShareCard';

export function HomeScreen({
  onGoAccount,
}: {
  onGoAccount?: () => void;
} = {}) {
  const {
    lastRoll,
    rolling,
    roll,
    saveError,
    lastJourneyUnlocks,
    lifetimeRollCount,
    settings,
    stats,
    fireCelebration,
    rollMode,
    setRollMode,
    attestRoll,
  } = useGame();
  const [shareOpen, setShareOpen] = useState(false);
  const [attestMsg, setAttestMsg] = useState<string | null>(null);
  const [slotValue, setSlotValue] = useState<number | null>(
    () => lastRoll?.number ?? null,
  );
  const [revealKey, setRevealKey] = useState(0);
  const [revealDone, setRevealDone] = useState(() => lastRoll != null);
  const pendingFx = useRef(false);

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

  // Clear ephemeral attest banner when the displayed roll changes
  useEffect(() => {
    setAttestMsg(null);
  }, [lastRoll?.id]);

  const handleRoll = async () => {
    setRevealDone(false);
    pendingFx.current = true;
    setAttestMsg(null);
    const outcome = await roll();
    if (!outcome) {
      setRevealDone(true);
      pendingFx.current = false;
      return;
    }
    setSlotValue(outcome.roll.number);
    setRevealKey((k) => k + 1);
  };

  const onRevealComplete = () => {
    setRevealDone(true);
    if (pendingFx.current && lastRoll) {
      playRollSound(lastRoll.rarity, settings.soundEnabled);
      if (settings.confettiEnabled && shouldCelebrate(lastRoll.rarity)) {
        fireCelebration();
      }
      // Auto-open share on mythic / anomaly (feature 10)
      if (
        lastRoll.rarity === 'mythic' ||
        lastRoll.rarity === 'anomaly'
      ) {
        setShareOpen(true);
      }
      pendingFx.current = false;
    }
  };

  const busy = rolling || (revealKey > 0 && !revealDone);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Fixed action column — button never jumps when badges load */}
      <div className="flex shrink-0 flex-col items-center gap-4 text-center">
        <OnboardingTip onGoAccount={onGoAccount} />

        <p className="max-w-sm text-sm text-[var(--prose-3)]">
          Unlimited rolls. No daily lock. Fortified browser CSPRNG.
        </p>

        {/* Feature 5 — optional challenge mode */}
        <div className="flex flex-wrap justify-center gap-1.5 text-[10px] font-bold uppercase">
          {(
            [
              ['free', 'Free play'],
              ['daily', 'Daily'],
              ['weekly', 'Weekly'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRollMode(id as RollMode)}
              className={`rounded border px-2 py-1 ${
                rollMode === id
                  ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                  : 'border-[var(--outline)] text-[var(--prose-3)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {rollMode !== 'free' && (
          <p className="max-w-sm text-[10px] text-[var(--prose-3)]">
            Challenge mode: personal number from shared {rollMode} seed + your
            account (verifiable). Free play stays unlimited CSPRNG.
          </p>
        )}

        {(stats.dayStreak > 0 || stats.qualityStreak > 0 || stats.bestRoll) && (
          <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--prose-3)]">
            {stats.dayStreak > 0 && <span>🔥 {stats.dayStreak}d streak</span>}
            {stats.qualityStreak > 0 && (
              <span>⚡ {stats.qualityStreak} quality</span>
            )}
            {stats.bestRoll && (
              <span>
                🏆 best {stats.bestRoll.totalEP.toLocaleString()} EP
              </span>
            )}
          </div>
        )}

        <NumberDisplay
          value={slotValue}
          rarity={revealDone ? lastRoll?.rarity : undefined}
          revealKey={revealKey}
          onRevealComplete={onRevealComplete}
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
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="text-xs font-bold uppercase tracking-wider text-[var(--prose-2)] underline-offset-2 hover:underline"
              onClick={() => setShareOpen(true)}
            >
              Share this roll
            </button>
            {!lastRoll.attestationSeal && (
              <button
                type="button"
                className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)] underline-offset-2 hover:underline"
                onClick={() => {
                  setAttestMsg(null);
                  void attestRoll(lastRoll).then((r) => {
                    setAttestMsg(
                      r
                        ? 'Server seal attached ✓'
                        : 'Seal failed — sign in and sync first',
                    );
                  });
                }}
              >
                Prove this roll
              </button>
            )}
            {lastRoll.attestationSeal && (
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                ✓ Sealed
              </span>
            )}
            {lastRoll.challengeKey && (
              <span className="text-[10px] font-bold uppercase text-[var(--prose-3)]">
                {lastRoll.challengeKey}
              </span>
            )}
          </div>
        )}
        {attestMsg && (
          <p className="text-xs text-[var(--prose-3)]">{attestMsg}</p>
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
          onGoAccount={onGoAccount}
        />
      )}
    </div>
  );
}
