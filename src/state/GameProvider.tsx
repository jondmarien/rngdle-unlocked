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
  performRoll,
  journeyHits,
  mergeSecretUnlocks,
  newlyUnlockedJourney,
  secretHits,
  sumJourneyEP,
  type AppSettings,
  type BadgeHit,
  type ChallengeKind,
  type CollectionEntry,
  type PlayStats,
  type RollResult,
  type ThemeMode,
} from '../game';
import { applyStreaks, recomputeBestConsecutive } from '../game/stats';
import { useSession } from '../lib/auth-client';
import { createLogger } from '../lib/logger';
import {
  fetchCloudSave,
  pushCloudSave,
  type CloudSavePayload,
} from '../lib/sync-api';
import {
  buildExportPayload,
  clearState,
  defaultState,
  backfillCollectionTimestamps,
  loadState,
  mergeCollection,
  parseImportPayload,
  prependHistory,
  saveState,
  type PersistedState,
} from './storage';

/** free = local CSPRNG · ranked = server free play · daily/weekly = challenges */
export type RollMode = 'free' | 'ranked' | ChallengeKind;

const log = createLogger('game');

function toCloudPayload(s: PersistedState): CloudSavePayload {
  return {
    lifetimeEP: s.lifetimeEP,
    lifetimeRollCount: s.lifetimeRollCount,
    journeyEP: s.journeyEP,
    collection: s.collection,
    stats: s.stats,
    history: s.history,
  };
}

export type RollOutcome = {
  roll: RollResult;
  journeyUnlocked: BadgeHit[];
  journeyEPGained: number;
  secretsUnlocked: BadgeHit[];
  secretsEPGained: number;
};

type GameContextValue = {
  lastRoll: RollResult | null;
  history: RollResult[];
  collection: CollectionEntry[];
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  settings: AppSettings;
  stats: PlayStats;
  rolling: boolean;
  saveError: string | null;
  lastJourneyUnlocks: BadgeHit[];
  lastSecretUnlocks: BadgeHit[];
  /** Badge ids first-time unlocked on the most recent roll (for NEW labels). */
  lastNewBadgeIds: string[];
  confettiToken: number;
  /** free = local CSPRNG; ranked = server free play; daily/weekly = challenges */
  rollMode: RollMode;
  setRollMode: (m: RollMode) => void;
  roll: () => Promise<RollOutcome | null>;
  /** Optional server seal for competitive bragging (feature 4). */
  attestRoll: (roll: RollResult) => Promise<{ seal: string } | null>;
  clearAll: () => void;
  setTheme: (theme: ThemeMode) => void;
  setShareShowRollCount: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setConfettiEnabled: (v: boolean) => void;
  setAutoScrollBadges: (v: boolean) => void;
  setAutoShareHighRarity: (v: boolean) => void;
  selectRoll: (roll: RollResult | null) => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<void>;
  fireCelebration: () => void;
  syncToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  syncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  /** Wait until roll is visible via public API (or fail). Logged-out → 'logged-out'. */
  waitForCloudPublish: (
    roll: RollResult,
  ) => Promise<'ok' | 'error' | 'logged-out'>;
};

const GameContext = createContext<GameContextValue | null>(null);

function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
  root.dataset.theme = dark ? 'dark' : 'light';
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const loggedInRef = useRef(false);
  loggedInRef.current = Boolean(session?.user);

  const [state, setState] = useState<PersistedState>(() => loadState());
  /** Session-only “current roll” on Home — not restored on refresh (history still persists). */
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [rolling, setRolling] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastJourneyUnlocks, setLastJourneyUnlocks] = useState<BadgeHit[]>([]);
  const [lastSecretUnlocks, setLastSecretUnlocks] = useState<BadgeHit[]>([]);
  const [lastNewBadgeIds, setLastNewBadgeIds] = useState<string[]>([]);
  const [confettiToken, setConfettiToken] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [rollMode, setRollModeState] = useState<RollMode>('free');

  /** Coalesce rapid auto-syncs so spam-rolling doesn't race the server. */
  const autoSyncChain = useRef(Promise.resolve());
  const latestAutoPayload = useRef<CloudSavePayload | null>(null);
  /** Always the latest persisted state (avoids stale force-push on share). */
  const stateRef = useRef(state);
  stateRef.current = state;
  /**
   * Bumped when mode changes (or an in-flight roll is abandoned) so a slow
   * free/challenge roll cannot paint onto a different mode after switch.
   */
  const rollEpochRef = useRef(0);

  useEffect(() => {
    applyTheme(state.settings.theme);
  }, [state.settings.theme]);

  const persist = useCallback((next: PersistedState) => {
    const ok = saveState(next);
    if (!ok) {
      setSaveError('Could not save progress (storage full or private mode).');
    } else {
      setSaveError(null);
    }
  }, []);

  const applyCloudPayload = useCallback(
    (cloud: {
      lifetimeEP: number;
      lifetimeRollCount: number;
      journeyEP: number;
      collection: CollectionEntry[];
      stats: PlayStats;
      history: RollResult[];
    }) => {
      const secretMerge = mergeSecretUnlocks(
        cloud.collection,
        new Date().toISOString(),
      );
      setState((prev) => {
        const history = cloud.history;
        const collection = backfillCollectionTimestamps(
          secretMerge.collection,
          history,
        );
        const next: PersistedState = {
          ...prev,
          lifetimeEP: cloud.lifetimeEP + secretMerge.ep,
          lifetimeRollCount: cloud.lifetimeRollCount,
          journeyEP: cloud.journeyEP + secretMerge.ep,
          collection,
          stats: cloud.stats,
          history,
        };
        persist(next);
        return next;
      });
      if (secretMerge.unlocked.length > 0) {
        setLastSecretUnlocks(secretHits(secretMerge.unlocked));
      }
      // Do not restore lastRoll from cloud — home stays a fresh slot until the
      // player rolls this session (history/stats still update).
      setLastSyncAt(new Date().toISOString());
    },
    [persist],
  );

  /** Background push after rolls when signed in (does not block the roll UI). */
  const enqueueAutoSync = useCallback(
    (payload: CloudSavePayload) => {
      if (!loggedInRef.current) return;
      latestAutoPayload.current = payload;
      autoSyncChain.current = autoSyncChain.current
        .then(async () => {
          if (!loggedInRef.current) return;
          const p = latestAutoPayload.current;
          if (!p) return;
          log.info('autoSync:start', {
            rolls: p.lifetimeRollCount,
            ep: p.lifetimeEP,
          });
          setSyncing(true);
          try {
            const merged = await pushCloudSave(p);
            // Only apply if this is still the latest enqueue (avoid clobbering newer local rolls)
            if (latestAutoPayload.current === p) {
              applyCloudPayload(merged);
              setSyncError(null);
            }
            log.info('autoSync:ok', { rolls: merged.lifetimeRollCount });
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Auto-sync failed';
            log.error('autoSync:fail', { message });
            setSyncError(message);
          } finally {
            setSyncing(false);
          }
        })
        .catch(() => {
          /* chain must not break */
        });
    },
    [applyCloudPayload],
  );

  // Backfill secret masteries if collection already qualifies; push to cloud for profile
  useEffect(() => {
    setState((prev) => {
      const { collection, unlocked, ep } = mergeSecretUnlocks(
        prev.collection,
        new Date().toISOString(),
      );
      if (unlocked.length === 0) return prev;
      const next = {
        ...prev,
        collection,
        lifetimeEP: prev.lifetimeEP + ep,
        journeyEP: prev.journeyEP + ep,
      };
      persist(next);
      setLastSecretUnlocks(secretHits(unlocked));
      log.info('secrets:backfill', {
        count: unlocked.length,
        ids: unlocked.map((u) => u.id),
      });
      if (loggedInRef.current) {
        enqueueAutoSync(toCloudPayload(next));
      }
      return next;
    });
  }, [persist, enqueueAutoSync]);

  /** Switch free/daily/weekly and abandon any in-flight roll UI. */
  const setRollMode = useCallback((m: RollMode) => {
    rollEpochRef.current += 1;
    setRollModeState(m);
    setLastRoll(null);
    setLastJourneyUnlocks([]);
    setLastSecretUnlocks([]);
    setLastNewBadgeIds([]);
    setRolling(false);
    log.debug('rollMode:switch', { mode: m, epoch: rollEpochRef.current });
  }, []);

  const roll = useCallback(async (): Promise<RollOutcome | null> => {
    if (rolling) return null;
    const epoch = rollEpochRef.current;
    const modeAtStart = rollMode;
    setRolling(true);
    log.debug('roll:start', {
      lifetimeRollCount: state.lifetimeRollCount,
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
        const res = await fetch('/api/ranked-roll', {
          method: 'POST',
          credentials: 'include',
        });
        const body = (await res.json().catch(() => ({}))) as {
          roll?: RollResult;
          error?: string;
          code?: string;
        };
        if (!res.ok || !body.roll) {
          const msg =
            body.error ||
            (res.status === 401
              ? 'Sign in to play Ranked free play.'
              : res.status === 429
                ? 'Ranked rate limit — try again later.'
                : res.status === 500
                  ? 'Ranked roll server error — try again in a moment.'
                  : 'Ranked roll failed.');
          setSaveError(msg);
          log.warn('ranked-roll:fail', {
            status: res.status,
            msg,
            body,
          });
          return null;
        }
        result = { ...body.roll, source: 'ranked' };
        setSaveError(null);
      } else {
        // Optional challenge: personal number from shared period seed + subject
        const info = buildPeriodSeed(modeAtStart);
        const userId = session?.user?.id;
        let subject = userId ?? 'guest:anon';
        if (!userId && typeof localStorage !== 'undefined') {
          const key = 'rngdle-unlocked:v1:guest';
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

      const prevCount = state.lifetimeRollCount;
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
      const history = prependHistory(state.history, result);
      let stats = applyStreaks(state.stats, result);
      stats = {
        ...stats,
        bestConsecutive: recomputeBestConsecutive(
          history,
          stats.bestConsecutive,
        ),
      };
      const ownedBefore = new Set(state.collection.map((c) => c.badgeId));
      let collection = mergeCollection(state.collection, collectionAdds, at);
      const secretMerge = mergeSecretUnlocks(collection, at);
      collection = secretMerge.collection;
      const secretsUnlocked = secretHits(secretMerge.unlocked);
      const secretsEPGained = secretMerge.ep;

      const newBadgeIds = [
        ...result.badges.map((b) => b.id),
        ...journeyUnlocked.map((b) => b.id),
        ...secretsUnlocked.map((b) => b.id),
      ].filter((id, i, arr) => arr.indexOf(id) === i && !ownedBefore.has(id));

      const next: PersistedState = {
        ...state,
        history,
        lifetimeRollCount: nextCount,
        lifetimeEP:
          state.lifetimeEP +
          result.totalEP +
          journeyEPGained +
          secretsEPGained,
        journeyEP: state.journeyEP + journeyEPGained + secretsEPGained,
        collection,
        stats,
      };
      persist(next);
      setState(next);
      setLastRoll(result);
      setLastJourneyUnlocks(journeyUnlocked);
      setLastSecretUnlocks(secretsUnlocked);
      setLastNewBadgeIds(newBadgeIds);
      if (secretsUnlocked.length > 0) {
        setConfettiToken((t) => t + 1);
      }
      log.info('roll:ok', {
        number: result.number,
        totalEP: result.totalEP,
        rarity: result.rarity,
        badges: result.badges.length,
        journeyUnlocked: journeyUnlocked.length,
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
        secretsUnlocked,
        secretsEPGained,
      };
    } catch (err) {
      log.error('roll:fail', {
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      if (epoch === rollEpochRef.current) {
        setRolling(false);
      }
    }
  }, [enqueueAutoSync, persist, rolling, rollMode, session?.user, state]);

  const attestRoll = useCallback(
    async (rollResult: RollResult): Promise<{ seal: string } | null> => {
      if (!loggedInRef.current) return null;
      try {
        const res = await fetch('/api/attest', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rollResult.id,
            number: rollResult.number,
            totalEP: rollResult.totalEP,
            rolledAt: rollResult.rolledAt,
            shortCode: rollResult.shortCode,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          seal?: string;
        };
        if (!res.ok || !data.seal) {
          log.warn('attest:fail', { error: data.error, status: res.status });
          return null;
        }
        const sealed = { ...rollResult, attestationSeal: data.seal };
        setLastRoll((prev) =>
          prev?.id === rollResult.id ? sealed : prev,
        );
        setState((prev) => {
          const history = prev.history.map((r) =>
            r.id === rollResult.id ? sealed : r,
          );
          const next = { ...prev, history };
          persist(next);
          return next;
        });
        log.info('attest:ok', { id: rollResult.id });
        return { seal: data.seal };
      } catch (e) {
        log.error('attest:error', {
          err: e instanceof Error ? e.message : String(e),
        });
        return null;
      }
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    clearState();
    setState(defaultState());
    setLastRoll(null);
    setLastJourneyUnlocks([]);
    setLastSecretUnlocks([]);
    setLastNewBadgeIds([]);
    setSaveError(null);
  }, []);

  const patchSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      setState((prev) => {
        const next = {
          ...prev,
          settings: { ...prev.settings, ...partial },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setTheme = useCallback(
    (theme: ThemeMode) => patchSettings({ theme }),
    [patchSettings],
  );
  const setShareShowRollCount = useCallback(
    (shareShowRollCount: boolean) => patchSettings({ shareShowRollCount }),
    [patchSettings],
  );
  const setSoundEnabled = useCallback(
    (soundEnabled: boolean) => patchSettings({ soundEnabled }),
    [patchSettings],
  );
  const setConfettiEnabled = useCallback(
    (confettiEnabled: boolean) => patchSettings({ confettiEnabled }),
    [patchSettings],
  );
  const setAutoScrollBadges = useCallback(
    (autoScrollBadges: boolean) => patchSettings({ autoScrollBadges }),
    [patchSettings],
  );
  const setAutoShareHighRarity = useCallback(
    (autoShareHighRarity: boolean) => patchSettings({ autoShareHighRarity }),
    [patchSettings],
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
      next.stats = {
        ...next.stats,
        bestConsecutive: recomputeBestConsecutive(
          next.history,
          next.stats.bestConsecutive,
        ),
      };
      const secretMerge = mergeSecretUnlocks(
        next.collection,
        new Date().toISOString(),
      );
      next = {
        ...next,
        collection: backfillCollectionTimestamps(
          secretMerge.collection,
          next.history,
        ),
        lifetimeEP: next.lifetimeEP + secretMerge.ep,
        journeyEP: next.journeyEP + secretMerge.ep,
      };
      persist(next);
      setState(next);
      setLastRoll(next.history[0] ?? null);
      setLastJourneyUnlocks([]);
      setLastSecretUnlocks(secretHits(secretMerge.unlocked));
    },
    [persist],
  );

  const fireCelebration = useCallback(() => {
    setConfettiToken((t) => t + 1);
  }, []);

  const syncToCloud = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    log.info('syncToCloud:start', {
      rolls: state.lifetimeRollCount,
      ep: state.lifetimeEP,
    });
    try {
      const merged = await pushCloudSave(toCloudPayload(state));
      applyCloudPayload(merged);
      log.info('syncToCloud:ok', { rolls: merged.lifetimeRollCount });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      log.error('syncToCloud:fail', { message });
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  }, [applyCloudPayload, state]);

  const pullFromCloud = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    log.info('pullFromCloud:start');
    try {
      const cloud = await fetchCloudSave();
      if (!cloud) {
        log.warn('pullFromCloud:empty');
        setSyncError('Nothing in the cloud yet — push first.');
        return;
      }
      // Merge pull with local then save
      const merged = await pushCloudSave(toCloudPayload(state));
      applyCloudPayload(merged);
      log.info('pullFromCloud:ok', { rolls: merged.lifetimeRollCount });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Pull failed';
      log.error('pullFromCloud:fail', { message });
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  }, [applyCloudPayload, state]);

  const waitForCloudPublish = useCallback(
    async (roll: RollResult): Promise<'ok' | 'error' | 'logged-out'> => {
      if (!loggedInRef.current) return 'logged-out';
      // Drain auto-sync queue first
      await autoSyncChain.current.catch(() => {});
      const key = roll.shortCode || roll.id;

      const ensurePayloadHasRoll = (): CloudSavePayload => {
        const base = toCloudPayload(stateRef.current);
        if (base.history.some((r) => r.id === roll.id)) return base;
        return {
          ...base,
          history: [roll, ...base.history].slice(0, 500),
        };
      };

      // Immediate force-push so the roll is not waiting on a failed auto-sync
      try {
        setSyncing(true);
        const merged = await pushCloudSave(ensurePayloadHasRoll());
        applyCloudPayload(merged);
      } catch (e) {
        log.error('waitForCloudPublish:push fail', {
          err: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setSyncing(false);
      }

      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const res = await fetch(
            `/api/rolls/${encodeURIComponent(key)}`,
            { credentials: 'include' },
          );
          if (res.ok) {
            log.info('waitForCloudPublish:ok', { key, attempt });
            return 'ok';
          }
        } catch {
          /* retry */
        }
        // Re-push mid-loop if still missing (handles transient 500s)
        if (attempt === 2 || attempt === 5) {
          try {
            await pushCloudSave(ensurePayloadHasRoll());
          } catch {
            /* continue polling */
          }
        }
        await new Promise((r) => setTimeout(r, 400 + attempt * 150));
      }
      log.error('waitForCloudPublish:exhausted', { key });
      return 'error';
    },
    [applyCloudPayload],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      lastRoll,
      history: state.history,
      collection: state.collection,
      lifetimeEP: state.lifetimeEP,
      lifetimeRollCount: state.lifetimeRollCount,
      journeyEP: state.journeyEP,
      settings: state.settings,
      stats: state.stats,
      rolling,
      saveError,
      lastJourneyUnlocks,
      lastSecretUnlocks,
      lastNewBadgeIds,
      confettiToken,
      rollMode,
      setRollMode,
      roll,
      attestRoll,
      clearAll,
      setTheme,
      setShareShowRollCount,
      setSoundEnabled,
      setConfettiEnabled,
      setAutoScrollBadges,
      setAutoShareHighRarity,
      selectRoll,
      exportSave,
      importSave,
      fireCelebration,
      syncToCloud,
      pullFromCloud,
      syncing,
      lastSyncAt,
      syncError,
      waitForCloudPublish,
    }),
    [
      lastRoll,
      state,
      rolling,
      saveError,
      lastJourneyUnlocks,
      lastSecretUnlocks,
      lastNewBadgeIds,
      confettiToken,
      rollMode,
      setRollMode,
      roll,
      attestRoll,
      clearAll,
      setTheme,
      setShareShowRollCount,
      setSoundEnabled,
      setConfettiEnabled,
      setAutoScrollBadges,
      setAutoShareHighRarity,
      selectRoll,
      exportSave,
      importSave,
      fireCelebration,
      syncToCloud,
      pullFromCloud,
      syncing,
      lastSyncAt,
      syncError,
      waitForCloudPublish,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
