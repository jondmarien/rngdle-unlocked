import { useEffect, useMemo, useRef, useState } from 'react';
import {
  contributeKeyEntropy,
  contributePointerEntropy,
  findChallengeRollForPeriod,
  topPercentFromEP,
  type RollResult,
} from '../../game';
import {
  playRollSound,
  shouldCelebrate,
  shouldTrashCrack,
} from '../../game/fx';
import { createLogger } from '../../lib/logger';
import { useGame, useGameSettings } from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { BestRollCard } from '../components/BestRollCard';
import { CommunityHighlights } from '../components/CommunityHighlights';
import { CountUpEP } from '../components/CountUpEP';
import { GenerateButton } from '../components/GenerateButton';
import { LatestRunsPanel } from '../components/LatestRunsPanel';
import { NumberDisplay } from '../components/NumberDisplay';
import { OnboardingTip } from '../components/OnboardingTip';
import { RarityBadge } from '../components/RarityBadge';
import { RankedQuotaPill } from '../components/RankedQuotaPill';
import { RollModePicker } from '../components/RollModePicker';
import { RollReplayModal } from '../components/RollReplayModal';
import { LazySharePanel } from '../components/LazySharePanel';

const log = createLogger('home');

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
    lastNewBadgeIds,
    lifetimeRollCount,
    stats,
    history,
    fireCelebration,
    clearCelebration,
    rollMode,
    setRollMode,
    selectRoll,
    attestRoll,
  } = useGame();
  const { settings } = useGameSettings();
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);
  const [attestMsg, setAttestMsg] = useState<string | null>(null);
  // Fresh home each load: empty reel until this session’s first Generate.
  const [slotValue, setSlotValue] = useState<number | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const [revealDone, setRevealDone] = useState(false);
  const [cascadeKey, setCascadeKey] = useState(0);
  /** True from Generate until roll() returns a number (pre-reel scramble). */
  const [awaitingResult, setAwaitingResult] = useState(false);
  const pendingFx = useRef(false);
  /** Roll that is currently revealing (not a later race-y lastRoll). */
  const revealRollRef = useRef<RollResult | null>(null);
  const shareTimerRef = useRef<number | null>(null);

  const clearShareTimer = () => {
    if (shareTimerRef.current != null) {
      window.clearTimeout(shareTimerRef.current);
      shareTimerRef.current = null;
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      contributePointerEntropy(e.clientX, e.clientY, performance.now());
    };
    const onKey = (e: KeyboardEvent) => {
      contributeKeyEntropy(
        e.keyCode || e.key.charCodeAt(0) || 0,
        performance.now(),
      );
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
      clearShareTimer();
    };
  }, []);

  useEffect(() => {
    setAttestMsg(null);
  }, [lastRoll?.id]);

  /**
   * Mode switch must wipe the whole roll board (reel, meta, share, cascade).
   * Use a remount key so NumberDisplay internal lastRevealKey cannot collide
   * with a reused revealKey after reset (that stuck the reel on ?????).
   * Daily/Weekly: if this UTC period is already claimed, settle that roll
   * (do not depend on `history` here — a post-roll history update must not
   * wipe mid-reveal).
   */
  const [reelMountKey, setReelMountKey] = useState(0);
  useEffect(() => {
    clearShareTimer();
    setShareRoll(null);
    setReplayRoll(null);
    setAttestMsg(null);
    setSlotValue(null);
    setRevealKey(0);
    setRevealDone(false);
    setCascadeKey(0);
    setAwaitingResult(false);
    pendingFx.current = false;
    revealRollRef.current = null;
    clearCelebration();
    setReelMountKey((k) => k + 1);

    if (rollMode === 'daily' || rollMode === 'weekly') {
      const existing = findChallengeRollForPeriod(history, rollMode);
      if (existing) {
        selectRoll(existing);
        setSlotValue(existing.number);
        setRevealDone(true);
        revealRollRef.current = existing;
      }
    }
    // history intentionally omitted — only re-hydrate on mode change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [rollMode, selectRoll]);

  /** Daily/Weekly: already claimed this UTC period (history is source of truth). */
  const periodLocked = useMemo(() => {
    if (rollMode !== 'daily' && rollMode !== 'weekly') return null;
    return findChallengeRollForPeriod(history, rollMode) ?? null;
  }, [history, rollMode]);

  const handleRoll = async () => {
    if (periodLocked) return;
    // Cancel deferred anomaly/mythic share from a previous roll
    clearShareTimer();
    setShareRoll(null);
    // Tear down in-flight celebrate FX so the next settle remounts cleanly
    // (avoids rare-tier CSS/confetti "sticking" over a later anomaly/epic).
    clearCelebration();
    setRevealDone(false);
    setAwaitingResult(true);
    pendingFx.current = true;
    revealRollRef.current = null;
    setAttestMsg(null);
    // Scramble immediately while roll() resolves
    setSlotValue(null);
    try {
      const outcome = await roll();
      if (!outcome) {
        // Keep empty reel; allow another Generate (do not leave "settling" busy)
        setRevealDone(false);
        pendingFx.current = false;
        setAwaitingResult(false);
        return;
      }
      revealRollRef.current = outcome.roll;
      // Set number first, then bump reveal so NumberDisplay always sees both
      setSlotValue(outcome.roll.number);
      setRevealKey((k) => k + 1);
    } catch (e) {
      pendingFx.current = false;
      setRevealDone(false);
      log.error('handleRoll failed', {
        err: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setAwaitingResult(false);
    }
  };

  const onRevealComplete = () => {
    setRevealDone(true);
    setCascadeKey((k) => k + 1);
    const settled = revealRollRef.current;
    if (pendingFx.current && settled) {
      playRollSound(settled.rarity, settings.soundEnabled);
      if (settings.confettiEnabled && shouldCelebrate(settled.rarity)) {
        fireCelebration(settled.rarity);
      } else if (
        settings.trashCrackEnabled !== false &&
        shouldTrashCrack(settled.rarity)
      ) {
        fireCelebration(settled.rarity);
      }
      if (
        settings.autoShareHighRarity &&
        (settled.rarity === 'mythic' || settled.rarity === 'anomaly')
      ) {
        const rollId = settled.id;
        clearShareTimer();
        // Only open share if this roll is still the one we settled
        shareTimerRef.current = window.setTimeout(() => {
          shareTimerRef.current = null;
          if (revealRollRef.current?.id === rollId) {
            setShareRoll(settled);
          }
        }, 900);
      }
      pendingFx.current = false;
    }
  };

  const numberSettling = revealKey > 0 && !revealDone;
  const busy = rolling || awaitingResult || numberSettling;
  // Community bests only on an idle fresh board (no active/finished session roll).
  const showCommunityBest = !rolling && !lastRoll && !busy;
  const showPendingEp = awaitingResult || numberSettling;
  const showMeta = lastRoll && revealDone;
  const best = stats.bestRoll;
  const bestFull = useMemo(() => {
    if (!best) return null;
    return history.find((r) => r.id === best.id) ?? null;
  }, [history, best]);

  const latestRunsLane =
    rollMode === 'ranked'
      ? 'ranked'
      : rollMode === 'daily' || rollMode === 'weekly'
        ? 'challenge'
        : 'free';

  const challengeLockedLabel =
    rollMode === 'weekly' ? 'Done for this week' : 'Done for today';

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {/* Fixed right rail under sticky header — does not squeeze the roll column */}
      {settings.showLatestRuns !== false && (
        <div className="pointer-events-none fixed bottom-3 right-3 top-[8rem] z-30 hidden w-[min(18.5rem,calc(100vw-2rem))] xl:block">
          <div className="pointer-events-auto h-full max-h-[calc(100dvh-9rem)]">
            <LatestRunsPanel
              history={history}
              activeRollId={lastRoll?.id ?? null}
              defaultLane={latestRunsLane}
              onSelect={(r) => setReplayRoll(r)}
            />
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-col items-center gap-5 text-center">
        <OnboardingTip onGoAccount={onGoAccount} />

        <RollModePicker value={rollMode} onChange={setRollMode} />

        {rollMode === 'ranked' && (
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <RankedQuotaPill />
          </div>
        )}

        {!busy && !lastRoll && (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {(stats.dayStreak > 0 || stats.qualityStreak > 0) && (
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
              </div>
            )}
            {best && (
              <div className="w-full text-left">
                <BestRollCard
                  best={best}
                  fullRoll={bestFull}
                  compact
                  onReplay={
                    bestFull ? () => setReplayRoll(bestFull) : undefined
                  }
                  onShare={bestFull ? () => setShareRoll(bestFull) : undefined}
                />
              </div>
            )}
          </div>
        )}

        <NumberDisplay
          key={reelMountKey}
          value={slotValue}
          rarity={revealDone ? lastRoll?.rarity : undefined}
          revealKey={revealKey}
          onRevealComplete={onRevealComplete}
          spinning={awaitingResult}
        />

        <div className="flex min-h-[4.5rem] flex-col items-center justify-center gap-2">
          {showPendingEp && <CountUpEP value={0} pending />}
          {showMeta && (
            <div className="number-fade-in flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <RarityBadge rarity={lastRoll.rarity} />
                <span className="text-sm text-[var(--prose-2)]">
                  Top {topPercentFromEP(lastRoll.totalEP)}%
                </span>
              </div>
              <CountUpEP
                value={lastRoll.totalEP}
                runKey={revealKey}
                durationMs={Math.min(1800, 600 + lastRoll.badges.length * 100)}
              />
            </div>
          )}
          {!lastRoll && !busy && (
            <p className="text-sm text-[var(--prose-2)]">
              Press Generate to roll
            </p>
          )}
        </div>

        {revealDone && lastJourneyUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded-lg border border-[var(--accent)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm leading-snug">
            Journey unlocked: {lastJourneyUnlocks.map((j) => j.name).join(', ')}{' '}
            (+
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
              {lastSecretUnlocks.reduce((a, b) => a + b.ep, 0).toLocaleString()}{' '}
              lifetime EP · open Codex → Secret
            </p>
          </div>
        )}

        <GenerateButton
          hasRolled={!!lastRoll}
          busy={busy}
          locked={!!periodLocked}
          lockedLabel={challengeLockedLabel}
          onClick={handleRoll}
        />

        {periodLocked && revealDone && (
          <p className="max-w-md text-sm text-[var(--prose-2)]">
            {rollMode === 'weekly'
              ? 'Weekly challenge is locked until the next UTC week — same seed would only repeat this number.'
              : 'Daily challenge is locked until the next UTC day — same seed would only repeat this number.'}{' '}
            Free play and Ranked stay available.
          </p>
        )}

        {lastRoll && revealDone && (
          <div className="flex w-full max-w-md flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--prose)] hover:border-[var(--prose-2)]"
                onClick={() => setShareRoll(lastRoll)}
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
            {lastRoll.source === 'ranked' && (
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Ranked · server roll · places on Leaderboard → Ranked
              </p>
            )}
            {lastRoll.source === 'client' && rollMode === 'free' && (
              <p className="text-sm text-[var(--prose-2)]">
                Free play · places on Leaderboard → Practice (not Ranked)
              </p>
            )}
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

        {/* Keep mounted so fetch state isn't torn down (avoids racey empty flashes). */}
        <div
          className={`flex w-full max-w-2xl justify-center pt-2 ${
            showCommunityBest ? '' : 'hidden'
          }`}
          aria-hidden={!showCommunityBest}
        >
          <CommunityHighlights
            onOpenProfile={onOpenProfile}
            onOpenRoll={onOpenRoll}
          />
        </div>
      </div>

      {lastRoll && revealDone && (
        <div key={cascadeKey} className="mt-8 min-h-0 flex-1 pb-8">
          <BadgeBreakdown
            badges={lastRoll.badges}
            number={lastRoll.number}
            newBadgeIds={lastNewBadgeIds}
            animateCascade
            autoScroll={settings.autoScrollBadges !== false}
          />
        </div>
      )}

      {/* Mobile / tablet: latest runs below roll (not a side squeeze) */}
      {settings.showLatestRuns !== false && (
        <div className="mt-8 w-full xl:hidden">
          <LatestRunsPanel
            history={history}
            activeRollId={lastRoll?.id ?? null}
            defaultLane={latestRunsLane}
            onSelect={(r) => setReplayRoll(r)}
          />
        </div>
      )}

      {shareRoll && (
        <LazySharePanel
          roll={shareRoll}
          rollCount={lifetimeRollCount}
          showRollCount={settings.shareShowRollCount}
          onClose={() => setShareRoll(null)}
          onGoAccount={onGoAccount}
        />
      )}

      {replayRoll && (
        <RollReplayModal
          roll={replayRoll}
          onClose={() => setReplayRoll(null)}
          onShare={() => {
            setShareRoll(replayRoll);
            setReplayRoll(null);
          }}
        />
      )}
    </div>
  );
}
