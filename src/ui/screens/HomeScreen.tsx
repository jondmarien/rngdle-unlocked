import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  contributeKeyEntropy,
  contributePointerEntropy,
  ensureShortCode,
  findChallengeRollForPeriod,
  listUnlockedSeals,
  topPercentFromEP,
  type RollResult,
} from '../../game';
import {
  playRollSound,
  shouldCelebrate,
  shouldTrashCrack,
} from '../../game/fx';
import { useSession } from '../../lib/auth-client';
import { haptic } from '../../lib/haptics';
import { createLogger } from '../../lib/logger';
import {
  useCloudSync,
  useGame,
  useGameSettings,
} from '../../state/GameProvider';
import { BadgeBreakdown } from '../components/BadgeCard';
import { BestRollCard } from '../components/BestRollCard';
import { CommunityHighlights } from '../components/CommunityHighlights';
import { CountUpEP } from '../components/CountUpEP';
import { GenerateButton } from '../components/GenerateButton';
import { LatestRunsPanel } from '../components/LatestRunsPanel';
import { NumberDisplay } from '../components/NumberDisplay';
import type { TabId } from '../../lib/routes';
import { useCountdownToUtcReset } from '../../lib/useCountdownToUtcReset';
import { OnboardingTip } from '../components/OnboardingTip';
import { SignedInOnboardingChecklist } from '../components/SignedInOnboardingChecklist';
import { RarityBadge } from '../components/RarityBadge';
import { RankedQuotaPill } from '../components/RankedQuotaPill';
import { RollModePicker } from '../components/RollModePicker';
import { RollReplayModal } from '../components/RollReplayModal';
import { LazySharePanel } from '../components/LazySharePanel';
import {
  BadgeArtLightbox,
  type BadgeArtLightboxItem,
} from '../components/BadgeArtLightbox';
import { motion } from 'motion/react';

const log = createLogger('home');

type ProvePublishState = 'idle' | 'checking' | 'ready' | 'error' | 'logged-out';

function attestFailureMessage(
  reason: 'logged-out' | 'not-synced' | 'failed',
): string {
  switch (reason) {
    case 'logged-out':
      return 'Seal failed. Sign in first.';
    case 'not-synced':
      return 'Still syncing this roll — try again in a moment.';
    case 'failed':
      return 'Seal failed. Try again in a moment.';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function HomeScreen({
  onGoAccount,
  onGoTab,
  onOpenProfile,
  onOpenRoll,
}: {
  onGoAccount?: () => void;
  onGoTab?: (tab: TabId) => void;
  onOpenProfile?: (username: string) => void;
  onOpenRoll?: (id: string, username?: string | null) => void;
} = {}) {
  const {
    lastRoll,
    rolling,
    roll,
    saveError,
    reportSaveError,
    lastJourneyUnlocks,
    lastLifetimeEpUnlocks,
    lastSecretUnlocks,
    lastNewBadgeIds,
    lifetimeRollCount,
    stats,
    history,
    collection,
    fireCelebration,
    clearCelebration,
    rollMode,
    setRollMode,
    selectRoll,
    attestRoll,
  } = useGame();
  const { settings } = useGameSettings();
  const { data: session } = useSession();
  const { waitForCloudPublish } = useCloudSync();
  const loggedIn = Boolean(session?.user);
  const unlockedSealNames = useMemo(
    () =>
      settings.shareShowUnlockedBadges !== false
        ? listUnlockedSeals(collection.map((c) => c.badgeId)).map((s) => s.name)
        : [],
    [collection, settings.shareShowUnlockedBadges],
  );
  const [shareRoll, setShareRoll] = useState<RollResult | null>(null);
  const [replayRoll, setReplayRoll] = useState<RollResult | null>(null);
  const [lightbox, setLightbox] = useState<BadgeArtLightboxItem | null>(null);
  const [attestMsg, setAttestMsg] = useState<string | null>(null);
  const [provePublish, setProvePublish] = useState<ProvePublishState>('idle');
  const [attestBusy, setAttestBusy] = useState(false);
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
  const proveBtnRef = useRef<HTMLButtonElement>(null);
  const proveTipRef = useRef<HTMLDivElement>(null);

  /** Popover top-layer defaults to the viewport corner — pin above the button. */
  const showProveTip = () => {
    const tip = proveTipRef.current;
    const btn = proveBtnRef.current;
    if (!tip?.showPopover || !btn) return;
    const r = btn.getBoundingClientRect();
    tip.style.position = 'fixed';
    tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
    tip.style.top = `${Math.round(r.top - 8)}px`;
    tip.style.transform = 'translate(-50%, -100%)';
    tip.style.margin = '0';
    tip.showPopover();
  };

  const hideProveTip = () => {
    proveTipRef.current?.hidePopover?.();
  };

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
   * Gate Prove roll on cloud publish for this roll (Free/challenge need sync;
   * Ranked is already in Neon). Mirrors SharePanel's waitForCloudPublish.
   */
  useEffect(() => {
    if (!lastRoll || lastRoll.attestationSeal || !revealDone) {
      setProvePublish('idle');
      return;
    }
    if (!loggedIn) {
      setProvePublish('logged-out');
      return;
    }
    if (lastRoll.source === 'ranked') {
      setProvePublish('ready');
      return;
    }

    let cancelled = false;
    setProvePublish('checking');
    const rollWithCode = ensureShortCode(lastRoll);
    log.info('prove:publish:wait', { rollId: lastRoll.id });
    void waitForCloudPublish(rollWithCode).then((result) => {
      if (cancelled) return;
      if (result === 'ok') setProvePublish('ready');
      else if (result === 'logged-out') setProvePublish('logged-out');
      else setProvePublish('error');
      log.info('prove:publish:result', { result, rollId: lastRoll.id });
    });
    return () => {
      cancelled = true;
    };
  }, [
    lastRoll,
    lastRoll?.id,
    lastRoll?.attestationSeal,
    lastRoll?.source,
    lastRoll?.shortCode,
    loggedIn,
    revealDone,
    waitForCloudPublish,
  ]);

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
    setProvePublish('idle');
    setAttestBusy(false);
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
    haptic('tap', settings.hapticsEnabled === true);
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
        haptic('error', settings.hapticsEnabled === true);
        return;
      }
      revealRollRef.current = outcome.roll;
      // Set number first, then bump reveal so NumberDisplay always sees both
      setSlotValue(outcome.roll.number);
      setRevealKey((k) => k + 1);
    } catch (e) {
      pendingFx.current = false;
      setRevealDone(false);
      const msg = e instanceof Error ? e.message : String(e);
      log.error('handleRoll failed', { err: msg });
      reportSaveError(msg || 'Roll failed — try again.');
      haptic('error', settings.hapticsEnabled === true);
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
      haptic('reveal', settings.hapticsEnabled === true);
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
        (settled.rarity === 'mythic' ||
          settled.rarity === 'anomaly' ||
          settled.rarity === 'divine')
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

  const challengePeriod =
    rollMode === 'daily' || rollMode === 'weekly' ? rollMode : null;
  const { label: challengeResetLabel } =
    useCountdownToUtcReset(challengePeriod);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      {/* Fixed right rail under sticky header — portaled so RouteEnter/SuspenseReveal
          y-transforms do not rebind position:fixed to the centered main column. */}
      {settings.showLatestRuns !== false &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed bottom-3 right-3 top-32 z-30 hidden w-[min(18.5rem,calc(100vw-2rem))] xl:block">
            <div className="pointer-events-auto h-full max-h-[calc(100dvh-9rem)]">
              <LatestRunsPanel
                history={history}
                activeRollId={lastRoll?.id ?? null}
                defaultLane={latestRunsLane}
                onSelect={(r) => setReplayRoll(r)}
              />
            </div>
          </div>,
          document.body,
        )}

      <div className="flex shrink-0 flex-col items-center gap-5 text-center">
        <OnboardingTip onGoAccount={onGoAccount} />
        <SignedInOnboardingChecklist
          onGoAccount={onGoAccount}
          onGoTab={onGoTab}
          onSelectRanked={() => setRollMode('ranked')}
        />

        <RollModePicker value={rollMode} onChange={setRollMode} />

        {rollMode === 'ranked' && (
          <div className="flex max-w-full flex-wrap justify-center gap-2 text-sm">
            <RankedQuotaPill />
          </div>
        )}

        {!busy && !lastRoll && (
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {(stats.dayStreak > 0 || stats.qualityStreak > 0) && (
              <div className="flex flex-wrap justify-center gap-2 text-sm text-(--prose-2)">
                {stats.dayStreak > 0 && (
                  <span className="rounded-md border border-(--outline) px-2.5 py-1">
                    {stats.dayStreak}d streak
                  </span>
                )}
                {stats.qualityStreak > 0 && (
                  <span className="rounded-md border border-(--outline) px-2.5 py-1">
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

        <div className="flex min-h-18 flex-col items-center justify-center gap-2">
          {showPendingEp && <CountUpEP value={0} pending />}
          {showMeta && (
            <div className="number-fade-in flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <RarityBadge rarity={lastRoll.rarity} />
                <span className="text-sm text-(--prose-2)">
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
            <p className="text-sm text-(--prose-2)">Press Generate to roll</p>
          )}
        </div>

        {revealDone && lastJourneyUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded-lg border border-(--accent) bg-(--surface-raised) px-3 py-2.5 text-left text-sm leading-snug">
            <p className="text-xs font-bold uppercase tracking-wider text-(--accent)">
              Journey unlocked
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastJourneyUnlocks.map((j) => {
                const chip = (
                  <>
                    {j.image ? (
                      <motion.img
                        layoutId={`home-badge-${j.id}`}
                        src={j.image}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-10 w-10 items-center justify-center text-xl"
                        aria-hidden
                      >
                        {j.emoji}
                      </span>
                    )}
                    <span className="font-semibold text-(--prose)">
                      {j.name}
                    </span>
                  </>
                );
                if (!j.image) {
                  return (
                    <div
                      key={j.id}
                      className="flex items-center gap-2 rounded-lg border border-(--accent)/30 bg-black/10 p-1.5 pr-2 dark:bg-black/20"
                    >
                      {chip}
                    </div>
                  );
                }
                return (
                  <button
                    key={j.id}
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-(--accent)/30 bg-black/10 p-1.5 pr-2 text-left dark:bg-black/20"
                    onClick={() =>
                      setLightbox({
                        image: j.image!,
                        name: j.name,
                        description: j.description,
                        ep: j.ep,
                        kind: 'Journey',
                        layoutId: `home-badge-${j.id}`,
                      })
                    }
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-(--prose-2)">
              +
              {lastJourneyUnlocks
                .reduce((a, b) => a + b.ep, 0)
                .toLocaleString()}{' '}
              lifetime EP
            </p>
          </div>
        )}

        {revealDone && lastLifetimeEpUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded-lg border border-amber-500/50 bg-(--surface-raised) px-3 py-2.5 text-left text-sm leading-snug">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Lifetime EP unlocked
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastLifetimeEpUnlocks.map((j) => {
                const chip = (
                  <>
                    {j.image ? (
                      <motion.img
                        layoutId={`home-badge-${j.id}`}
                        src={j.image}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-10 w-10 items-center justify-center text-xl"
                        aria-hidden
                      >
                        {j.emoji}
                      </span>
                    )}
                    <span className="font-semibold text-(--prose)">
                      {j.name}
                    </span>
                  </>
                );
                if (!j.image) {
                  return (
                    <div
                      key={j.id}
                      className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-black/10 p-1.5 pr-2 dark:bg-black/20"
                    >
                      {chip}
                    </div>
                  );
                }
                return (
                  <button
                    key={j.id}
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-black/10 p-1.5 pr-2 text-left dark:bg-black/20"
                    onClick={() =>
                      setLightbox({
                        image: j.image!,
                        name: j.name,
                        description: j.description,
                        ep: j.ep,
                        kind: 'Lifetime EP',
                        layoutId: `home-badge-${j.id}`,
                      })
                    }
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            {lastLifetimeEpUnlocks.reduce((a, b) => a + b.ep, 0) > 0 ? (
              <p className="mt-2 text-(--prose-2)">
                +
                {lastLifetimeEpUnlocks
                  .reduce((a, b) => a + b.ep, 0)
                  .toLocaleString()}{' '}
                lifetime EP
              </p>
            ) : (
              <p className="mt-2 text-(--prose-2)">
                Past milestones claimed — open Codex → Lifetime EP
              </p>
            )}
          </div>
        )}

        {revealDone && lastSecretUnlocks.length > 0 && (
          <div className="number-fade-in w-full max-w-md rounded-xl border-2 border-amber-400/60 bg-linear-to-br from-violet-500/15 via-amber-500/10 to-teal-500/15 px-4 py-3 text-left text-sm leading-snug shadow-[0_0_24px_rgba(251,191,36,0.15)]">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Secret mastery
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastSecretUnlocks.map((s) => {
                const img =
                  s.image ??
                  (s.id === 'secret-omega-codex'
                    ? '/secrets/omega.jpg'
                    : `/secrets/${s.id.replace('secret-master-', '')}.jpg`);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-black/20 p-1.5 pr-2 text-left"
                    onClick={() =>
                      setLightbox({
                        image: img,
                        name: s.name,
                        description: s.description,
                        ep: s.ep,
                        kind: 'Secret mastery',
                        layoutId: `home-badge-${s.id}`,
                      })
                    }
                  >
                    <motion.img
                      layoutId={`home-badge-${s.id}`}
                      src={img}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <span className="font-semibold text-(--prose)">
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-(--prose-2)">
              +
              {lastSecretUnlocks.reduce((a, b) => a + b.ep, 0).toLocaleString()}{' '}
              lifetime EP · open Codex → Secret
            </p>
          </div>
        )}

        {lightbox && (
          <BadgeArtLightbox item={lightbox} onClose={() => setLightbox(null)} />
        )}

        <GenerateButton
          hasRolled={!!lastRoll}
          busy={busy}
          locked={!!periodLocked}
          lockedLabel={challengeLockedLabel}
          onClick={handleRoll}
        />

        {periodLocked && revealDone && (
          <p className="max-w-md text-sm text-(--prose-2)">
            {challengeResetLabel}. Same seed would only repeat this number. Free
            play and Ranked stay available.
          </p>
        )}

        {lastRoll && revealDone && (
          <div className="flex w-full max-w-md flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="rounded-md border border-(--accent)/45 bg-(--surface) px-3 py-2 text-sm font-semibold text-(--accent) hover:border-(--accent) hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                onClick={() => setShareRoll(lastRoll)}
              >
                Share
              </button>
              {!lastRoll.attestationSeal ? (
                <>
                  <button
                    ref={proveBtnRef}
                    type="button"
                    disabled={provePublish !== 'ready' || attestBusy}
                    className="rounded-md border border-(--accent)/45 bg-(--surface) px-3 py-2 text-sm font-semibold text-(--accent) hover:border-(--accent) hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-describedby="prove-roll-tip"
                    onMouseEnter={showProveTip}
                    onMouseLeave={hideProveTip}
                    onFocus={showProveTip}
                    onBlur={hideProveTip}
                    onClick={() => {
                      if (provePublish !== 'ready' || attestBusy) return;
                      hideProveTip();
                      setAttestMsg(null);
                      setAttestBusy(true);
                      void attestRoll(lastRoll)
                        .then((r) => {
                          if (r.ok) {
                            setAttestMsg(
                              'Server seal attached. This stamps the claim; free-play RNG is still client-side.',
                            );
                          } else {
                            setAttestMsg(attestFailureMessage(r.reason));
                          }
                        })
                        .finally(() => setAttestBusy(false));
                    }}
                  >
                    {provePublish === 'checking'
                      ? 'Syncing…'
                      : attestBusy
                        ? 'Sealing…'
                        : 'Prove roll'}
                  </button>
                  <div
                    ref={proveTipRef}
                    id="prove-roll-tip"
                    popover="auto"
                    className="m-0 max-w-xs rounded-lg border border-(--outline) bg-(--surface-raised) p-3 text-left text-sm text-(--prose) shadow-lg"
                  >
                    <p className="font-semibold text-(--prose)">Prove roll</p>
                    <p className="mt-1 text-(--prose-2)">
                      Asks the server to HMAC-seal this roll <em>claim</em>{' '}
                      after you sign in and sync. Use it when you want a
                      timestamped stamp on a shareable roll.
                    </p>
                    <p className="mt-1.5 text-xs text-(--prose-3)">
                      Not proof of honest Free-play RNG — only the claim is
                      sealed.
                    </p>
                  </div>
                </>
              ) : (
                <span className="rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Sealed
                </span>
              )}
            </div>
            {provePublish === 'logged-out' &&
              !lastRoll.attestationSeal &&
              revealDone && (
                <p className="max-w-sm text-sm leading-snug text-(--prose-2)">
                  Sign in and sync to seal this roll.
                </p>
              )}
            {provePublish === 'error' &&
              !lastRoll.attestationSeal &&
              revealDone && (
                <p className="max-w-sm text-sm leading-snug text-(--prose-2)">
                  Cloud sync failed — try Account → Push, then Prove roll again.
                </p>
              )}
            {lastRoll.source === 'ranked' && (
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Ranked · server roll · places on Leaderboard → Ranked
              </p>
            )}
            {lastRoll.source === 'client' && rollMode === 'free' && (
              <p className="text-sm text-(--prose-2)">
                Free play · places on Leaderboard → Practice (not Ranked)
              </p>
            )}
            {lastRoll.challengeKey && (
              <p className="text-sm text-(--prose-2)">
                Challenge:{' '}
                <span className="font-mono font-medium text-(--prose)">
                  {lastRoll.challengeKey}
                </span>
              </p>
            )}
            {lastRoll.attestationSeal && !attestMsg && (
              <p className="max-w-sm text-sm leading-snug text-(--prose-2)">
                Server stamped this roll. That records the claim; it does not
                mean the number came from server RNG.
              </p>
            )}
            {attestMsg && (
              <p className="max-w-sm text-sm leading-snug text-(--prose-2)">
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
          showUnlockedBadges={settings.shareShowUnlockedBadges !== false}
          unlockedSealNames={unlockedSealNames}
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
