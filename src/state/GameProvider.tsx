import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  buildPeriodSeed,
  challengeNumber,
  evaluateNumber,
  findChallengeRollForPeriod,
  performRoll,
  journeyHits,
  lifetimeEpBadgesForEp,
  lifetimeEpHits,
  mergeSecretUnlocks,
  mergeStreakUnlocks,
  newlyUnlockedJourney,
  newlyUnlockedLifetimeEp,
  secretHits,
  sumJourneyEP,
  sumLifetimeEpAward,
  type AppSettings,
  type BadgeHit,
  type ChallengeKind,
  type CollectionEntry,
  type PlayStats,
  type RarityTier,
  type RollResult,
  type ThemeMode,
} from '../game';
import {
  applyStreaks,
  bumpLifetimeRarity,
  finalizeStatsFromHistory,
} from '../game/stats';
import { useSession } from '../lib/auth-client';
import { createLogger } from '../lib/logger';
import { fetchMe } from '../lib/me-api';
import { applyDocumentAccent, normalizeAccent } from '../lib/profile-theme';
import {
  RANKED_QUOTA_QUERY_KEY,
  requestAttestation,
  requestRankedRoll,
} from '../lib/roll-api';
import { STORAGE_KEYS } from '../lib/storage-keys';
import { settingsReducer, type SettingsAction } from './settings';
import {
  buildExportPayload,
  clearState,
  defaultState,
  backfillCollectionTimestamps,
  isLifetimeEpBackfillDone,
  loadState,
  markLifetimeEpBackfillDone,
  mergeCollection,
  parseImportPayload,
  prependHistory,
  saveState,
  type PersistedState,
} from './storage';
import { toCloudPayload, useSync, type SyncControls } from './useSync';

/** free = local CSPRNG · ranked = server free play · daily/weekly = challenges */
export type RollMode = 'free' | 'ranked' | ChallengeKind;

/** Result of optional HMAC seal via POST /api/attest. */
export type AttestRollResult =
  | { ok: true; seal: string }
  | {
      ok: false;
      reason: 'logged-out' | 'not-synced' | 'failed';
      status?: number;
      error?: string;
    };

const log = createLogger('game');

export type RollOutcome = {
  roll: RollResult;
  journeyUnlocked: BadgeHit[];
  journeyEPGained: number;
  lifetimeEpUnlocked: BadgeHit[];
  lifetimeEpGained: number;
  secretsUnlocked: BadgeHit[];
  secretsEPGained: number;
};

/** Roll orchestration, progress, celebration FX. */
type GameContextValue = {
  lastRoll: RollResult | null;
  history: RollResult[];
  collection: CollectionEntry[];
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  stats: PlayStats;
  rolling: boolean;
  saveError: string | null;
  /** Surface an unexpected client error on the Home reel (e.g. handleRoll catch). */
  reportSaveError: (message: string) => void;
  lastJourneyUnlocks: BadgeHit[];
  lastLifetimeEpUnlocks: BadgeHit[];
  lastSecretUnlocks: BadgeHit[];
  /** Badge ids first-time unlocked on the most recent roll (for NEW labels). */
  lastNewBadgeIds: string[];
  confettiToken: number;
  /** Rarity for the active celebration burst (tiered FX). */
  celebrateRarity: RarityTier | null;
  /** free = local CSPRNG; ranked = server free play; daily/weekly = challenges */
  rollMode: RollMode;
  setRollMode: (m: RollMode) => void;
  roll: () => Promise<RollOutcome | null>;
  /** Optional server seal for competitive bragging (feature 4). */
  attestRoll: (roll: RollResult) => Promise<AttestRollResult>;
  clearAll: () => void;
  selectRoll: (roll: RollResult | null) => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<void>;
  fireCelebration: (rarity?: RarityTier) => void;
  /** Cancel in-flight celebrate FX (e.g. Roll again before settle finishes). */
  clearCelebration: () => void;
};

/** Settings + the 7 setters (reducer-backed). */
type GameSettingsValue = {
  settings: AppSettings;
  setTheme: (theme: ThemeMode) => void;
  setShareShowRollCount: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setConfettiEnabled: (v: boolean) => void;
  setTrashCrackEnabled: (v: boolean) => void;
  setAutoScrollBadges: (v: boolean) => void;
  setAutoShareHighRarity: (v: boolean) => void;
  setShowLatestRuns: (v: boolean) => void;
  setLatestRunsSpoilersHidden: (v: boolean) => void;
  setShareShowUnlockedBadges: (v: boolean) => void;
  setAbbreviateLargeNumbers: (v: boolean) => void;
  setApplyProfileAccentSiteWide: (v: boolean) => void;
  setHowToRollOpen: (v: boolean) => void;
};

const GameContext = createContext<GameContextValue | null>(null);
const GameSettingsContext = createContext<GameSettingsValue | null>(null);
const CloudSyncContext = createContext<SyncControls | null>(null);

function isDarkTheme(theme: ThemeMode): boolean {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'dark' || (theme === 'system' && prefersDark);
}

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  const dark = isDarkTheme(theme);
  root.classList.toggle('dark', dark);
  root.dataset.theme = dark ? 'dark' : 'light';
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const loggedInRef = useRef(false);
  loggedInRef.current = Boolean(session?.user);

  const [state, setState] = useState<PersistedState>(() => loadState());
  /** Session-only “current roll” on Home — not restored on refresh (history still persists). */
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastJourneyUnlocks, setLastJourneyUnlocks] = useState<BadgeHit[]>([]);
  const [lastLifetimeEpUnlocks, setLastLifetimeEpUnlocks] = useState<
    BadgeHit[]
  >([]);
  const [lastSecretUnlocks, setLastSecretUnlocks] = useState<BadgeHit[]>([]);
  const [lastNewBadgeIds, setLastNewBadgeIds] = useState<string[]>([]);
  const [confettiToken, setConfettiToken] = useState(0);
  const [celebrateRarity, setCelebrateRarity] = useState<RarityTier | null>(
    null,
  );
  const [rollMode, setRollModeState] = useState<RollMode>('free');

  /** Always the latest persisted state (avoids stale force-push on share). */
  const stateRef = useRef(state);
  stateRef.current = state;
  /**
   * Bumped when mode changes (or an in-flight roll is abandoned) so a slow
   * free/challenge roll cannot paint onto a different mode after switch.
   */
  const rollEpochRef = useRef(0);
  /** Sync guard — React `rolling` state can lag a tick and block Generate. */
  const rollInFlightRef = useRef(false);

  useEffect(() => {
    applyTheme(state.settings.theme);
  }, [state.settings.theme]);

  /** Optional site-wide `--accent` from Account profile accent (signed-in only). */
  useEffect(() => {
    const enabled =
      Boolean(session?.user) &&
      state.settings.applyProfileAccentSiteWide === true;
    if (!enabled) {
      applyDocumentAccent(null, isDarkTheme(state.settings.theme));
      return;
    }
    let cancelled = false;
    const dark = isDarkTheme(state.settings.theme);
    const applyFromMe = () => {
      void fetchMe()
        .then((data) => {
          if (cancelled) return;
          applyDocumentAccent(normalizeAccent(data.user?.profileAccent), dark);
        })
        .catch(() => {
          if (!cancelled) applyDocumentAccent(null, dark);
        });
    };
    applyFromMe();
    const onMeUpdated = () => applyFromMe();
    window.addEventListener('rngdle:me-updated', onMeUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('rngdle:me-updated', onMeUpdated);
      applyDocumentAccent(null, isDarkTheme(state.settings.theme));
    };
  }, [
    session?.user,
    state.settings.applyProfileAccentSiteWide,
    state.settings.theme,
  ]);

  const persist = useCallback((next: PersistedState) => {
    const ok = saveState(next);
    if (!ok) {
      setSaveError('Could not save progress (storage full or private mode).');
    } else {
      setSaveError(null);
    }
  }, []);

  const sync = useSync({
    loggedInRef,
    stateRef,
    setState,
    persist,
    onSecretUnlocks: setLastSecretUnlocks,
  });
  const { enqueueAutoSync, pullFromCloud } = sync;

  /** Auto-pull cloud on signed-out → signed-in (merge-safe; never blocks auth). */
  const wasLoggedInRef = useRef(Boolean(session?.user));
  useEffect(() => {
    const now = Boolean(session?.user);
    const was = wasLoggedInRef.current;
    wasLoggedInRef.current = now;
    if (!now || was) return;
    log.info('auth:signed-in:auto-pull');
    void pullFromCloud({ quietEmpty: true }).catch((err) => {
      log.warn('auth:signed-in:auto-pull-fail', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }, [session?.user, pullFromCloud]);

  // Backfill secret masteries + streak secrets if collection/stats already qualify
  useEffect(() => {
    setState((prev) => {
      const stats = finalizeStatsFromHistory(prev.stats, prev.history);
      const sectionMerge = mergeSecretUnlocks(
        prev.collection,
        new Date().toISOString(),
      );
      const streakMerge = mergeStreakUnlocks(
        sectionMerge.collection,
        stats,
        prev.history,
        new Date().toISOString(),
      );
      const unlocked = [...sectionMerge.unlocked, ...streakMerge.unlocked];
      const ep = sectionMerge.ep + streakMerge.ep;
      const statsChanged =
        stats.oddStreak !== prev.stats.oddStreak ||
        stats.evenStreak !== prev.stats.evenStreak ||
        stats.bestOddStreak !== prev.stats.bestOddStreak ||
        stats.bestEvenStreak !== prev.stats.bestEvenStreak;
      if (unlocked.length === 0 && !statsChanged) return prev;
      const next = {
        ...prev,
        stats,
        collection: streakMerge.collection,
        lifetimeEP: prev.lifetimeEP + ep,
        journeyEP: prev.journeyEP + ep,
      };
      persist(next);
      if (unlocked.length > 0) {
        setLastSecretUnlocks(secretHits(unlocked));
        log.info('secrets:backfill', {
          count: unlocked.length,
          ids: unlocked.map((u) => u.id),
        });
      }
      if (loggedInRef.current) {
        enqueueAutoSync(toCloudPayload(next));
      }
      return next;
    });
  }, [persist, enqueueAutoSync]);

  // Policy C: one-shot Lifetime EP seal backfill (collection + toast, no EP)
  useEffect(() => {
    if (isLifetimeEpBackfillDone()) return;
    setState((prev) => {
      if (isLifetimeEpBackfillDone()) return prev;
      const owned = new Set(prev.collection.map((c) => c.badgeId));
      const defs = lifetimeEpBadgesForEp(prev.lifetimeEP).filter(
        (b) => !owned.has(b.id),
      );
      markLifetimeEpBackfillDone();
      if (defs.length === 0) return prev;
      const at = new Date().toISOString();
      const hits = lifetimeEpHits(defs).map((h) => ({ ...h, ep: 0 }));
      const collection = mergeCollection(
        prev.collection,
        defs.map((b) => ({ id: b.id, family: b.family })),
        at,
      );
      // Re-run secrets after lifetime seals land (section mastery / omega).
      const secretMerge = mergeSecretUnlocks(collection, at);
      const secretsEP = secretMerge.ep;
      const next = {
        ...prev,
        collection: secretMerge.collection,
        lifetimeEP: prev.lifetimeEP + secretsEP,
        journeyEP: prev.journeyEP + secretsEP,
      };
      persist(next);
      setLastLifetimeEpUnlocks(hits);
      if (secretMerge.unlocked.length > 0) {
        setLastSecretUnlocks(secretHits(secretMerge.unlocked));
      }
      log.info('lifetimeEp:backfill', {
        count: defs.length,
        ids: defs.map((d) => d.id),
        epAwarded: 0,
        secretsEP,
      });
      if (loggedInRef.current) {
        enqueueAutoSync(toCloudPayload(next));
      }
      return next;
    });
  }, [persist, enqueueAutoSync]);

  /** Switch free/daily/weekly/ranked and abandon any in-flight roll UI. */
  const setRollMode = useCallback((m: RollMode) => {
    rollEpochRef.current += 1;
    rollInFlightRef.current = false;
    setRollModeState(m);
    setLastRoll(null);
    setLastJourneyUnlocks([]);
    setLastLifetimeEpUnlocks([]);
    setLastSecretUnlocks([]);
    setLastNewBadgeIds([]);
    setRolling(false);
    log.debug('rollMode:switch', { mode: m, epoch: rollEpochRef.current });
  }, []);

  const roll = useCallback(async (): Promise<RollOutcome | null> => {
    if (rollInFlightRef.current || rolling) return null;
    const epoch = rollEpochRef.current;
    const modeAtStart = rollMode;
    rollInFlightRef.current = true;
    setRolling(true);
    log.debug('roll:start', {
      lifetimeRollCount: stateRef.current.lifetimeRollCount,
      rollMode: modeAtStart,
      epoch,
    });
    try {
      let result: RollResult;
      if (modeAtStart === 'free') {
        result = await performRoll();
        result.source = 'client';
      } else if (modeAtStart === 'ranked') {
        // Server CSPRNG free play — only these count for leaderboard / crowns
        if (!session?.user) {
          setSaveError('Sign in to play Ranked free play.');
          return null;
        }
        const ranked = await requestRankedRoll();
        if (ranked.quota) {
          queryClient.setQueryData(RANKED_QUOTA_QUERY_KEY, ranked.quota);
        }
        if (!ranked.ok) {
          const msg =
            ranked.error ||
            (ranked.status === 401
              ? 'Sign in to play Ranked free play.'
              : ranked.status === 429
                ? 'Ranked rate limit — try again later.'
                : ranked.status === 500
                  ? 'Ranked roll server error — try again in a moment.'
                  : 'Ranked roll failed.');
          setSaveError(msg);
          log.warn('ranked-roll:fail', {
            status: ranked.status,
            msg,
            body: ranked.body,
          });
          return null;
        }
        result = { ...ranked.roll, source: 'ranked' };
        setSaveError(null);
      } else {
        // Optional challenge: personal number from shared period seed + subject.
        // One spin per UTC period — re-spins would only duplicate the same number.
        const existing = findChallengeRollForPeriod(
          stateRef.current.history,
          modeAtStart,
        );
        if (existing) {
          setLastRoll(existing);
          setLastJourneyUnlocks([]);
          setLastLifetimeEpUnlocks([]);
          setLastSecretUnlocks([]);
          setLastNewBadgeIds([]);
          log.debug('roll:challenge-locked', {
            challengeKey: existing.challengeKey,
            id: existing.id,
          });
          return {
            roll: existing,
            journeyUnlocked: [],
            journeyEPGained: 0,
            lifetimeEpUnlocked: [],
            lifetimeEpGained: 0,
            secretsUnlocked: [],
            secretsEPGained: 0,
          };
        }
        const info = buildPeriodSeed(modeAtStart);
        const userId = session?.user?.id;
        let subject = userId ?? 'guest:anon';
        if (!userId && typeof localStorage !== 'undefined') {
          const key = STORAGE_KEYS.guest;
          let g = localStorage.getItem(key);
          if (!g) {
            g = crypto.randomUUID();
            try {
              localStorage.setItem(key, g);
            } catch {
              /* ignore */
            }
          }
          subject = `guest:${g}`;
        }
        const n = await challengeNumber(info.seed, subject);
        result = evaluateNumber(n, new Date(), {
          challengeKey: `${modeAtStart}:${info.periodKey}`,
        });
        result.source = 'challenge';
      }

      // Mode switched (or board reset) while async work ran — drop the result.
      if (epoch !== rollEpochRef.current) {
        log.debug('roll:abandoned', { epoch, modeAtStart });
        return null;
      }

      // Always read latest persisted state after awaits (sync / prior rolls).
      const base = stateRef.current;
      const prevCount = base.lifetimeRollCount;
      const nextCount = prevCount + 1;
      const unlockedDefs = newlyUnlockedJourney(prevCount, nextCount);
      const journeyUnlocked = journeyHits(unlockedDefs);
      const journeyEPGained = sumJourneyEP(unlockedDefs);
      const at = result.rolledAt;

      const collectionAdds = [
        ...result.badges.map((b) => ({ id: b.id, family: b.family })),
        ...journeyUnlocked.map((b) => ({ id: b.id, family: b.family })),
      ];

      // Compute next state synchronously so auto-sync pushes this roll, not stale state
      const history = prependHistory(base.history, result);
      let stats = applyStreaks(base.stats, result);
      stats = bumpLifetimeRarity(stats, result.rarity);
      stats = finalizeStatsFromHistory(stats, history);
      const ownedBefore = new Set(base.collection.map((c) => c.badgeId));
      let collection = mergeCollection(base.collection, collectionAdds, at);
      const secretMerge = mergeSecretUnlocks(collection, at);
      collection = secretMerge.collection;
      const streakMerge = mergeStreakUnlocks(collection, stats, history, at);
      collection = streakMerge.collection;
      const secretsUnlocked = secretHits([
        ...secretMerge.unlocked,
        ...streakMerge.unlocked,
      ]);
      const secretsEPGained = secretMerge.ep + streakMerge.ep;

      // Lifetime EP seals: check after roll + journey + secret EP, before own awards
      const epBeforeLifetimeSeals =
        base.lifetimeEP + result.totalEP + journeyEPGained + secretsEPGained;
      const lifetimeEpDefs = newlyUnlockedLifetimeEp(
        base.lifetimeEP,
        epBeforeLifetimeSeals,
      );
      const lifetimeEpUnlocked = lifetimeEpHits(lifetimeEpDefs);
      const lifetimeEpGained = sumLifetimeEpAward(lifetimeEpDefs);
      if (lifetimeEpDefs.length > 0) {
        collection = mergeCollection(
          collection,
          lifetimeEpDefs.map((b) => ({ id: b.id, family: b.family })),
          at,
        );
        // Section mastery / omega may unlock from new lifetime seals
        const lifetimeSecretMerge = mergeSecretUnlocks(collection, at);
        collection = lifetimeSecretMerge.collection;
        if (lifetimeSecretMerge.unlocked.length > 0) {
          secretsUnlocked.push(...secretHits(lifetimeSecretMerge.unlocked));
        }
        // secretsEPGained already applied; add any mastery EP from lifetime seals
        const extraSecretEp = lifetimeSecretMerge.ep;
        const newBadgeIds = [
          ...result.badges.map((b) => b.id),
          ...journeyUnlocked.map((b) => b.id),
          ...lifetimeEpUnlocked.map((b) => b.id),
          ...secretsUnlocked.map((b) => b.id),
        ].filter((id, i, arr) => arr.indexOf(id) === i && !ownedBefore.has(id));

        const next: PersistedState = {
          ...base,
          history,
          lifetimeRollCount: nextCount,
          lifetimeEP: epBeforeLifetimeSeals + lifetimeEpGained + extraSecretEp,
          journeyEP:
            base.journeyEP +
            journeyEPGained +
            secretsEPGained +
            lifetimeEpGained +
            extraSecretEp,
          collection,
          stats,
        };
        persist(next);
        setState(next);
        setLastRoll(result);
        setLastJourneyUnlocks(journeyUnlocked);
        setLastLifetimeEpUnlocks(lifetimeEpUnlocked);
        setLastSecretUnlocks(secretsUnlocked);
        setLastNewBadgeIds(newBadgeIds);
        if (secretsUnlocked.length > 0) {
          setCelebrateRarity('mythic');
          setConfettiToken((t) => t + 1);
        }
        log.info('roll:ok', {
          number: result.number,
          totalEP: result.totalEP,
          rarity: result.rarity,
          badges: result.badges.length,
          journeyUnlocked: journeyUnlocked.length,
          lifetimeEpUnlocked: lifetimeEpUnlocked.length,
          secretsUnlocked: secretsUnlocked.length,
          challengeKey: result.challengeKey,
          willAutoSync: loggedInRef.current,
        });

        enqueueAutoSync(toCloudPayload(next));

        return {
          roll: result,
          journeyUnlocked,
          journeyEPGained,
          lifetimeEpUnlocked,
          lifetimeEpGained,
          secretsUnlocked,
          secretsEPGained: secretsEPGained + extraSecretEp,
        };
      }

      const newBadgeIds = [
        ...result.badges.map((b) => b.id),
        ...journeyUnlocked.map((b) => b.id),
        ...secretsUnlocked.map((b) => b.id),
      ].filter((id, i, arr) => arr.indexOf(id) === i && !ownedBefore.has(id));

      const next: PersistedState = {
        ...base,
        history,
        lifetimeRollCount: nextCount,
        lifetimeEP: epBeforeLifetimeSeals,
        journeyEP: base.journeyEP + journeyEPGained + secretsEPGained,
        collection,
        stats,
      };
      persist(next);
      setState(next);
      setLastRoll(result);
      setLastJourneyUnlocks(journeyUnlocked);
      setLastLifetimeEpUnlocks([]);
      setLastSecretUnlocks(secretsUnlocked);
      setLastNewBadgeIds(newBadgeIds);
      if (secretsUnlocked.length > 0) {
        setCelebrateRarity('mythic');
        setConfettiToken((t) => t + 1);
      }
      log.info('roll:ok', {
        number: result.number,
        totalEP: result.totalEP,
        rarity: result.rarity,
        badges: result.badges.length,
        journeyUnlocked: journeyUnlocked.length,
        lifetimeEpUnlocked: 0,
        secretsUnlocked: secretsUnlocked.length,
        challengeKey: result.challengeKey,
        willAutoSync: loggedInRef.current,
      });

      // Fire-and-forget cloud push when signed in (share links + leaderboards stay live)
      enqueueAutoSync(toCloudPayload(next));

      return {
        roll: result,
        journeyUnlocked,
        journeyEPGained,
        lifetimeEpUnlocked: [],
        lifetimeEpGained: 0,
        secretsUnlocked,
        secretsEPGained,
      };
    } catch (err) {
      log.error('roll:fail', {
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      // Always release the lock — mode switch may have already cleared these
      rollInFlightRef.current = false;
      setRolling(false);
    }
  }, [enqueueAutoSync, persist, queryClient, rolling, rollMode, session?.user]);

  const attestRoll = useCallback(
    async (rollResult: RollResult): Promise<AttestRollResult> => {
      if (!loggedInRef.current) {
        return { ok: false, reason: 'logged-out' };
      }
      try {
        const attested = await requestAttestation({
          id: rollResult.id,
          number: rollResult.number,
          totalEP: rollResult.totalEP,
          rolledAt: rollResult.rolledAt,
          shortCode: rollResult.shortCode,
        });
        if (!attested.ok) {
          log.warn('attest:fail', {
            error: attested.error,
            status: attested.status,
          });
          if (attested.status === 401) {
            return { ok: false, reason: 'logged-out', status: 401 };
          }
          if (attested.status === 404) {
            return {
              ok: false,
              reason: 'not-synced',
              status: 404,
              error: attested.error,
            };
          }
          return {
            ok: false,
            reason: 'failed',
            status: attested.status,
            error: attested.error,
          };
        }
        const sealed = { ...rollResult, attestationSeal: attested.seal };
        setLastRoll((prev) => (prev?.id === rollResult.id ? sealed : prev));
        setState((prev) => {
          const history = prev.history.map((r) =>
            r.id === rollResult.id ? sealed : r,
          );
          const next = { ...prev, history };
          persist(next);
          return next;
        });
        log.info('attest:ok', { id: rollResult.id });
        return { ok: true, seal: attested.seal };
      } catch (e) {
        log.error('attest:error', {
          err: e instanceof Error ? e.message : String(e),
        });
        return { ok: false, reason: 'failed' };
      }
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    clearState();
    setState(defaultState());
    setLastRoll(null);
    setLastJourneyUnlocks([]);
    setLastLifetimeEpUnlocks([]);
    setLastSecretUnlocks([]);
    setLastNewBadgeIds([]);
    setSaveError(null);
  }, []);

  const dispatchSettings = useCallback(
    (action: SettingsAction) => {
      setState((prev) => {
        const next = {
          ...prev,
          settings: settingsReducer(prev.settings, action),
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const selectRoll = useCallback((rollResult: RollResult | null) => {
    setLastRoll(rollResult);
    setLastNewBadgeIds([]);
  }, []);

  const exportSave = useCallback(() => {
    const payload = buildExportPayload(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rngdle-unlocked-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importSave = useCallback(
    async (file: File) => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('File is not valid JSON');
      }
      let next = parseImportPayload(parsed);
      const at = new Date().toISOString();
      next = {
        ...next,
        stats: finalizeStatsFromHistory(next.stats, next.history),
      };
      const secretMerge = mergeSecretUnlocks(next.collection, at);
      const streakMerge = mergeStreakUnlocks(
        secretMerge.collection,
        next.stats,
        next.history,
        at,
      );
      next = {
        ...next,
        collection: backfillCollectionTimestamps(
          streakMerge.collection,
          next.history,
        ),
        lifetimeEP: next.lifetimeEP + secretMerge.ep + streakMerge.ep,
        journeyEP: next.journeyEP + secretMerge.ep + streakMerge.ep,
      };
      persist(next);
      setState(next);
      setLastRoll(next.history[0] ?? null);
      setLastJourneyUnlocks([]);
      setLastLifetimeEpUnlocks([]);
      setLastSecretUnlocks(
        secretHits([...secretMerge.unlocked, ...streakMerge.unlocked]),
      );
    },
    [persist],
  );

  const fireCelebration = useCallback((rarity?: RarityTier) => {
    setCelebrateRarity(rarity ?? 'rare');
    setConfettiToken((t) => t + 1);
  }, []);

  const clearCelebration = useCallback(() => {
    setCelebrateRarity(null);
  }, []);

  const reportSaveError = useCallback((message: string) => {
    setSaveError(message);
  }, []);

  const gameValue = useMemo<GameContextValue>(
    () => ({
      lastRoll,
      history: state.history,
      collection: state.collection,
      lifetimeEP: state.lifetimeEP,
      lifetimeRollCount: state.lifetimeRollCount,
      journeyEP: state.journeyEP,
      stats: state.stats,
      rolling,
      saveError,
      reportSaveError,
      lastJourneyUnlocks,
      lastLifetimeEpUnlocks,
      lastSecretUnlocks,
      lastNewBadgeIds,
      confettiToken,
      celebrateRarity,
      rollMode,
      setRollMode,
      roll,
      attestRoll,
      clearAll,
      selectRoll,
      exportSave,
      importSave,
      fireCelebration,
      clearCelebration,
    }),
    [
      lastRoll,
      state,
      rolling,
      saveError,
      reportSaveError,
      lastJourneyUnlocks,
      lastLifetimeEpUnlocks,
      lastSecretUnlocks,
      lastNewBadgeIds,
      confettiToken,
      celebrateRarity,
      rollMode,
      setRollMode,
      roll,
      attestRoll,
      clearAll,
      selectRoll,
      exportSave,
      importSave,
      fireCelebration,
      clearCelebration,
    ],
  );

  const settingsValue = useMemo<GameSettingsValue>(
    () => ({
      settings: state.settings,
      setTheme: (value) => dispatchSettings({ type: 'setTheme', value }),
      setShareShowRollCount: (value) =>
        dispatchSettings({ type: 'setShareShowRollCount', value }),
      setSoundEnabled: (value) =>
        dispatchSettings({ type: 'setSoundEnabled', value }),
      setHapticsEnabled: (value) =>
        dispatchSettings({ type: 'setHapticsEnabled', value }),
      setConfettiEnabled: (value) =>
        dispatchSettings({ type: 'setConfettiEnabled', value }),
      setTrashCrackEnabled: (value) =>
        dispatchSettings({ type: 'setTrashCrackEnabled', value }),
      setAutoScrollBadges: (value) =>
        dispatchSettings({ type: 'setAutoScrollBadges', value }),
      setAutoShareHighRarity: (value) =>
        dispatchSettings({ type: 'setAutoShareHighRarity', value }),
      setShowLatestRuns: (value) =>
        dispatchSettings({ type: 'setShowLatestRuns', value }),
      setLatestRunsSpoilersHidden: (value) =>
        dispatchSettings({ type: 'setLatestRunsSpoilersHidden', value }),
      setShareShowUnlockedBadges: (value) =>
        dispatchSettings({ type: 'setShareShowUnlockedBadges', value }),
      setAbbreviateLargeNumbers: (value) =>
        dispatchSettings({ type: 'setAbbreviateLargeNumbers', value }),
      setApplyProfileAccentSiteWide: (value) =>
        dispatchSettings({ type: 'setApplyProfileAccentSiteWide', value }),
      setHowToRollOpen: (value) =>
        dispatchSettings({ type: 'setHowToRollOpen', value }),
    }),
    [state.settings, dispatchSettings],
  );

  const syncValue = useMemo<SyncControls>(
    () => ({
      syncing: sync.syncing,
      lastSyncAt: sync.lastSyncAt,
      syncError: sync.syncError,
      syncToCloud: sync.syncToCloud,
      pullFromCloud: sync.pullFromCloud,
      waitForCloudPublish: sync.waitForCloudPublish,
    }),
    [
      sync.syncing,
      sync.lastSyncAt,
      sync.syncError,
      sync.syncToCloud,
      sync.pullFromCloud,
      sync.waitForCloudPublish,
    ],
  );

  return (
    <GameSettingsContext.Provider value={settingsValue}>
      <CloudSyncContext.Provider value={syncValue}>
        <GameContext.Provider value={gameValue}>
          {children}
        </GameContext.Provider>
      </CloudSyncContext.Provider>
    </GameSettingsContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function useGameSettings(): GameSettingsValue {
  const ctx = useContext(GameSettingsContext);
  if (!ctx) {
    throw new Error('useGameSettings must be used within GameProvider');
  }
  return ctx;
}

export function useCloudSync(): SyncControls {
  const ctx = useContext(CloudSyncContext);
  if (!ctx) throw new Error('useCloudSync must be used within GameProvider');
  return ctx;
}
