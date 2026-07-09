import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  performRoll,
  journeyHits,
  newlyUnlockedJourney,
  sumJourneyEP,
  type AppSettings,
  type BadgeHit,
  type CollectionEntry,
  type PlayStats,
  type RollResult,
  type ThemeMode,
} from '../game';
import { applyStreaks, recomputeBestConsecutive } from '../game/stats';
import { createLogger } from '../lib/logger';
import { fetchCloudSave, pushCloudSave } from '../lib/sync-api';
import {
  buildExportPayload,
  clearState,
  defaultState,
  loadState,
  mergeCollection,
  parseImportPayload,
  prependHistory,
  saveState,
  type PersistedState,
} from './storage';

const log = createLogger('game');

export type RollOutcome = {
  roll: RollResult;
  journeyUnlocked: BadgeHit[];
  journeyEPGained: number;
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
  confettiToken: number;
  roll: () => Promise<RollOutcome | null>;
  clearAll: () => void;
  setTheme: (theme: ThemeMode) => void;
  setShareShowRollCount: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setConfettiEnabled: (v: boolean) => void;
  selectRoll: (roll: RollResult | null) => void;
  exportSave: () => void;
  importSave: (file: File) => Promise<void>;
  fireCelebration: () => void;
  syncToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  syncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
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
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [lastRoll, setLastRoll] = useState<RollResult | null>(
    () => loadState().history[0] ?? null,
  );
  const [rolling, setRolling] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastJourneyUnlocks, setLastJourneyUnlocks] = useState<BadgeHit[]>([]);
  const [confettiToken, setConfettiToken] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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

  const roll = useCallback(async (): Promise<RollOutcome | null> => {
    if (rolling) return null;
    setRolling(true);
    log.debug('roll:start', { lifetimeRollCount: state.lifetimeRollCount });
    try {
      const result = await performRoll();
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

      setState((prev) => {
        const history = prependHistory(prev.history, result);
        let stats = applyStreaks(prev.stats, result);
        stats = {
          ...stats,
          bestConsecutive: recomputeBestConsecutive(
            history,
            stats.bestConsecutive,
          ),
        };
        const next: PersistedState = {
          ...prev,
          history,
          lifetimeRollCount: nextCount,
          lifetimeEP: prev.lifetimeEP + result.totalEP + journeyEPGained,
          journeyEP: prev.journeyEP + journeyEPGained,
          collection: mergeCollection(prev.collection, collectionAdds, at),
          stats,
        };
        persist(next);
        return next;
      });
      setLastRoll(result);
      setLastJourneyUnlocks(journeyUnlocked);
      log.info('roll:ok', {
        number: result.number,
        totalEP: result.totalEP,
        rarity: result.rarity,
        badges: result.badges.length,
        journeyUnlocked: journeyUnlocked.length,
      });
      return { roll: result, journeyUnlocked, journeyEPGained };
    } catch (err) {
      log.error('roll:fail', {
        err: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      setRolling(false);
    }
  }, [persist, rolling, state.lifetimeRollCount]);

  const clearAll = useCallback(() => {
    clearState();
    setState(defaultState());
    setLastRoll(null);
    setLastJourneyUnlocks([]);
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

  const selectRoll = useCallback((rollResult: RollResult | null) => {
    setLastRoll(rollResult);
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
      const next = parseImportPayload(parsed);
      next.stats = {
        ...next.stats,
        bestConsecutive: recomputeBestConsecutive(
          next.history,
          next.stats.bestConsecutive,
        ),
      };
      persist(next);
      setState(next);
      setLastRoll(next.history[0] ?? null);
      setLastJourneyUnlocks([]);
    },
    [persist],
  );

  const fireCelebration = useCallback(() => {
    setConfettiToken((t) => t + 1);
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
      setState((prev) => {
        const next: PersistedState = {
          ...prev,
          lifetimeEP: cloud.lifetimeEP,
          lifetimeRollCount: cloud.lifetimeRollCount,
          journeyEP: cloud.journeyEP,
          collection: cloud.collection,
          stats: cloud.stats,
          history: cloud.history,
        };
        persist(next);
        return next;
      });
      setLastRoll(cloud.history[0] ?? null);
      setLastSyncAt(new Date().toISOString());
    },
    [persist],
  );

  const syncToCloud = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    log.info('syncToCloud:start', {
      rolls: state.lifetimeRollCount,
      ep: state.lifetimeEP,
    });
    try {
      const merged = await pushCloudSave({
        lifetimeEP: state.lifetimeEP,
        lifetimeRollCount: state.lifetimeRollCount,
        journeyEP: state.journeyEP,
        collection: state.collection,
        stats: state.stats,
        history: state.history,
      });
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
      const merged = await pushCloudSave({
        lifetimeEP: state.lifetimeEP,
        lifetimeRollCount: state.lifetimeRollCount,
        journeyEP: state.journeyEP,
        collection: state.collection,
        stats: state.stats,
        history: state.history,
      });
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
      confettiToken,
      roll,
      clearAll,
      setTheme,
      setShareShowRollCount,
      setSoundEnabled,
      setConfettiEnabled,
      selectRoll,
      exportSave,
      importSave,
      fireCelebration,
      syncToCloud,
      pullFromCloud,
      syncing,
      lastSyncAt,
      syncError,
    }),
    [
      lastRoll,
      state,
      rolling,
      saveError,
      lastJourneyUnlocks,
      confettiToken,
      roll,
      clearAll,
      setTheme,
      setShareShowRollCount,
      setSoundEnabled,
      setConfettiEnabled,
      selectRoll,
      exportSave,
      importSave,
      fireCelebration,
      syncToCloud,
      pullFromCloud,
      syncing,
      lastSyncAt,
      syncError,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
