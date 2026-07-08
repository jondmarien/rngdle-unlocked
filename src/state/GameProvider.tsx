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
  newlyUnlockedJourney,
  sumJourneyEP,
  type AppSettings,
  type BadgeHit,
  type CollectionEntry,
  type RollResult,
  type ThemeMode,
} from '../game';
import {
  clearState,
  defaultState,
  loadState,
  mergeCollection,
  prependHistory,
  saveState,
  type PersistedState,
} from './storage';

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
  rolling: boolean;
  saveError: string | null;
  lastJourneyUnlocks: BadgeHit[];
  roll: () => Promise<RollOutcome | null>;
  clearAll: () => void;
  setTheme: (theme: ThemeMode) => void;
  setShareShowRollCount: (v: boolean) => void;
  selectRoll: (roll: RollResult | null) => void;
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
    try {
      const result = await performRoll();
      const prevCount = state.lifetimeRollCount;
      const nextCount = prevCount + 1;
      const unlockedDefs = newlyUnlockedJourney(prevCount, nextCount);
      const journeyUnlocked = unlockedDefs.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        ep: b.ep,
        family: b.family,
      }));
      const journeyEPGained = sumJourneyEP(unlockedDefs);
      const at = result.rolledAt;

      const collectionAdds = [
        ...result.badges.map((b) => ({ id: b.id, family: b.family })),
        ...journeyUnlocked.map((b) => ({ id: b.id, family: b.family })),
      ];

      setState((prev) => {
        const next: PersistedState = {
          ...prev,
          history: prependHistory(prev.history, result),
          lifetimeRollCount: nextCount,
          lifetimeEP: prev.lifetimeEP + result.totalEP + journeyEPGained,
          journeyEP: prev.journeyEP + journeyEPGained,
          collection: mergeCollection(prev.collection, collectionAdds, at),
        };
        persist(next);
        return next;
      });
      setLastRoll(result);
      setLastJourneyUnlocks(journeyUnlocked);
      return { roll: result, journeyUnlocked, journeyEPGained };
    } finally {
      setRolling(false);
    }
  }, [persist, rolling, state.lifetimeRollCount]);

  const clearAll = useCallback(() => {
    clearState();
    const empty = defaultState();
    setState(empty);
    setLastRoll(null);
    setLastJourneyUnlocks([]);
    setSaveError(null);
  }, []);

  const setTheme = useCallback(
    (theme: ThemeMode) => {
      setState((prev) => {
        const next = {
          ...prev,
          settings: { ...prev.settings, theme },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setShareShowRollCount = useCallback(
    (shareShowRollCount: boolean) => {
      setState((prev) => {
        const next = {
          ...prev,
          settings: { ...prev.settings, shareShowRollCount },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const selectRoll = useCallback((rollResult: RollResult | null) => {
    setLastRoll(rollResult);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      lastRoll,
      history: state.history,
      collection: state.collection,
      lifetimeEP: state.lifetimeEP,
      lifetimeRollCount: state.lifetimeRollCount,
      journeyEP: state.journeyEP,
      settings: state.settings,
      rolling,
      saveError,
      lastJourneyUnlocks,
      roll,
      clearAll,
      setTheme,
      setShareShowRollCount,
      selectRoll,
    }),
    [
      lastRoll,
      state,
      rolling,
      saveError,
      lastJourneyUnlocks,
      roll,
      clearAll,
      setTheme,
      setShareShowRollCount,
      selectRoll,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
