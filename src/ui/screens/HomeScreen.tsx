import { useEffect, useRef, useState } from 'react';
import {
  contributeKeyEntropy,
  contributePointerEntropy,
  topPercentFromPercentile,
} from '../../game';
import { playRollSound, shouldCelebrate } from '../../game/fx';
import { useGame } from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { BadgePill } from '../components/BadgePill';
import { CommunityHighlights } from '../components/CommunityHighlights';
import { EPPill } from '../components/EPPill';
import { GenerateButton } from '../components/GenerateButton';
import { NumberDisplay } from '../components/NumberDisplay';
import { OnboardingTip } from '../components/OnboardingTip';
import { RarityBadge } from '../components/RarityBadge';
import { RollModePicker } from '../components/RollModePicker';
import { SharePanel } from '../components/ShareCard';

export function HomeScreen({
  onGoAccount,
  onOpenProfile,
  onOpenRoll,
}: {
  onGoAccount?: () => void;
  onOpenProfile?: (username: string) => void;
  onOpenRoll?: (id: string, username?: string | null) => void;
} = {}) {
  const {
    lastRoll,
    rolling,
    roll,
    saveError,
    lastJourneyUnlocks,
    lastSecretUnlocks,
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
      if (lastRoll.rarity === 'mythic' || lastRoll.rarity === 'anomaly') {
        setShareOpen(true);
      }
      pendingFx.current = false;
    }
  };

  const busy = rolling || (revealKey > 0 && !revealDone);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 flex-col items-center gap-5 text-center">
        <OnboardingTip onGoAccount={onGoAccount} />

        <RollModePicker value={rollMode} onChange={setRollMode} />

        {(stats.dayStreak > 0 || stats.qualityStreak > 0 || stats.bestRoll) && (
          <div className="flex flex-wrap justify-center gap-2 text-sm text-[var(--prose-2)]">
            {stats.dayStreak > 0 && (
              <span className="rounded-md border border-[var(--outline)] px-2.5 py-1">
                {stats.dayStreak}d streak
              </span>
            )}
            {stats.qualityStreak > 0 && (
              <span className="rounded-md border border-[var(--outline)] px-2.5 py-1">
                {stats.qualityStreak} quality
              </span>
            )}
            {stats.bestRoll && (
              <span className="rounded-md border border-[var(--outline)] px-2.5 py-1">
                Best {stats.bestRoll.totalEP.toLocaleString()} EP
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

        <div className="flex min-h-[5rem] flex-col items-center justify-center gap-2">
          {lastRoll && revealDone ? (
            <div className="number-fade-in flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <RarityBadge rarity={lastRoll.rarity} />
                <span className="text-sm text-[var(--prose-2)]">
                  Top {topPercentFromPercentile(lastRoll.percentile)}%
                </span>
              </div>
              <EPPill ep={lastRoll.totalEP} />
              {lastRoll.badges.length > 0 && (
                <div className="mt-1 flex max-w-md flex-wrap items-center justify-center gap-1.5">
                  {lastRoll.badges.slice(0, 8).map((b) => (
                    <BadgePill key={b.id} badge={b} compact />
                  ))}
                  {lastRoll.badges.length > 8 && (
                    <span className="rounded-full border border-[var(--outline)] bg-[var(--bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--prose-2)]">
                      +{lastRoll.badges.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : lastRoll && !revealDone ? (
            <p className="text-sm font-semibold text-[var(--prose-2)]">
              Rolling…
            </p>
          ) : (
            <p className="text-sm text-[var(--prose-2)]">
              Press Generate to roll
            </p>
          )}
        </div>

        {revealDone && lastJourneyUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded-lg border border-[var(--accent)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm leading-snug">
            Journey unlocked:{' '}
            {lastJourneyUnlocks.map((j) => j.name).join(', ')} (+
            {lastJourneyUnlocks
              .reduce((a, b) => a + b.ep, 0)
              .toLocaleString()}{' '}
            lifetime EP)
          </div>
        )}

        {revealDone && lastSecretUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded-xl border-2 border-amber-400/60 bg-gradient-to-br from-violet-500/15 via-amber-500/10 to-teal-500/15 px-4 py-3 text-left text-sm leading-snug shadow-[0_0_24px_rgba(251,191,36,0.15)]">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Secret mastery
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastSecretUnlocks.map((s) => {
                // Secrets store image on def; BadgeHit may only have emoji — look up path
                const img =
                  s.id === 'secret-omega-codex'
                    ? '/secrets/omega.jpg'
                    : `/secrets/${s.id.replace('secret-master-', '')}.jpg`;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-black/20 p-1.5 pr-2"
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <span className="font-semibold text-[var(--prose)]">
                      {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[var(--prose-2)]">
              +
              {lastSecretUnlocks
                .reduce((a, b) => a + b.ep, 0)
                .toLocaleString()}{' '}
              lifetime EP · open Codex → Secret
            </p>
          </div>
        )}

        <GenerateButton
          hasRolled={!!lastRoll}
          busy={busy}
          onClick={handleRoll}
        />

        {lastRoll && revealDone && (
          <div className="flex w-full max-w-md flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--prose)] hover:border-[var(--prose-2)]"
                onClick={() => setShareOpen(true)}
              >
                Share
              </button>
              {!lastRoll.attestationSeal ? (
                <button
                  type="button"
                  className="rounded-md border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--prose)] hover:border-[var(--prose-2)]"
                  title="Ask the server to HMAC-seal this roll claim. Not proof of honest RNG."
                  onClick={() => {
                    setAttestMsg(null);
                    void attestRoll(lastRoll).then((r) => {
                      setAttestMsg(
                        r
                          ? 'Server seal attached. This stamps the claim; free-play RNG is still client-side.'
                          : 'Seal failed. Sign in and sync first.',
                      );
                    });
                  }}
                >
                  Prove roll
                </button>
              ) : (
                <span className="rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Sealed
                </span>
              )}
            </div>
            {lastRoll.challengeKey && (
              <p className="text-sm text-[var(--prose-2)]">
                Challenge:{' '}
                <span className="font-mono font-medium text-[var(--prose)]">
                  {lastRoll.challengeKey}
                </span>
              </p>
            )}
            {lastRoll.attestationSeal && !attestMsg && (
              <p className="max-w-sm text-sm leading-snug text-[var(--prose-2)]">
                Server stamped this roll. That records the claim; it does not
                mean the number came from server RNG.
              </p>
            )}
            {attestMsg && (
              <p className="max-w-sm text-sm leading-snug text-[var(--prose-2)]">
                {attestMsg}
              </p>
            )}
          </div>
        )}

        {saveError && (
          <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
        )}

        <div className="w-full max-w-md pt-2">
          <CommunityHighlights
            onOpenProfile={onOpenProfile}
            onOpenRoll={onOpenRoll}
          />
        </div>
      </div>

      {lastRoll && revealDone && (
        <div className="number-fade-in mt-8 min-h-0 flex-1 overflow-y-auto pb-4">
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
