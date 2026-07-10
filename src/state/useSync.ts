import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { mergeSecretUnlocks, mergeStreakUnlocks, secretHits } from '../game';
import { finalizeStatsFromHistory } from '../game/stats';
import type { BadgeHit, RollResult } from '../game/types';
import { createLogger } from '../lib/logger';
import { isRollPublished } from '../lib/roll-api';
import {
  fetchCloudSave,
  pushCloudSave,
  type CloudSavePayload,
} from '../lib/sync-api';
import {
  backfillCollectionTimestamps,
  HISTORY_CAP,
  type PersistedState,
} from './storage';

const log = createLogger('game');

export function toCloudPayload(s: PersistedState): CloudSavePayload {
  return {
    lifetimeEP: s.lifetimeEP,
    lifetimeRollCount: s.lifetimeRollCount,
    journeyEP: s.journeyEP,
    collection: s.collection,
    stats: s.stats,
    history: s.history,
  };
}

export type SyncControls = {
  syncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  syncToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  /** Wait until roll is visible via public API (or fail). Logged-out → 'logged-out'. */
  waitForCloudPublish: (
    roll: RollResult,
  ) => Promise<'ok' | 'error' | 'logged-out'>;
};

export type SyncEngine = SyncControls & {
  applyCloudPayload: (cloud: CloudSavePayload) => void;
  /** Background push after rolls when signed in (does not block the roll UI). */
  enqueueAutoSync: (payload: CloudSavePayload) => void;
};

/**
 * Cloud sync orchestration extracted from GameProvider: the coalescing
 * auto-sync queue, cloud merge application, manual push/pull, and the
 * share-gate publish poll.
 */
export function useSync(opts: {
  loggedInRef: RefObject<boolean>;
  stateRef: RefObject<PersistedState>;
  setState: Dispatch<SetStateAction<PersistedState>>;
  persist: (next: PersistedState) => void;
  onSecretUnlocks: (hits: BadgeHit[]) => void;
}): SyncEngine {
  const { loggedInRef, stateRef, setState, persist, onSecretUnlocks } = opts;

  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  /** Coalesce rapid auto-syncs so spam-rolling doesn't race the server. */
  const autoSyncChain = useRef(Promise.resolve());
  const latestAutoPayload = useRef<CloudSavePayload | null>(null);

  const applyCloudPayload = useCallback(
    (cloud: CloudSavePayload) => {
      const at = new Date().toISOString();
      const history = cloud.history;
      const stats = finalizeStatsFromHistory(cloud.stats, history);
      const secretMerge = mergeSecretUnlocks(cloud.collection, at);
      const streakMerge = mergeStreakUnlocks(
        secretMerge.collection,
        stats,
        history,
        at,
      );
      const unlocked = [...secretMerge.unlocked, ...streakMerge.unlocked];
      const ep = secretMerge.ep + streakMerge.ep;
      setState((prev) => {
        const collection = backfillCollectionTimestamps(
          streakMerge.collection,
          history,
        );
        const next: PersistedState = {
          ...prev,
          lifetimeEP: cloud.lifetimeEP + ep,
          lifetimeRollCount: cloud.lifetimeRollCount,
          journeyEP: cloud.journeyEP + ep,
          collection,
          stats,
          history,
        };
        persist(next);
        return next;
      });
      if (unlocked.length > 0) {
        onSecretUnlocks(secretHits(unlocked));
      }
      // Do not restore lastRoll from cloud — home stays a fresh slot until the
      // player rolls this session (history/stats still update).
      setLastSyncAt(new Date().toISOString());
    },
    [setState, persist, onSecretUnlocks],
  );

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
    [applyCloudPayload, loggedInRef],
  );

  const syncToCloud = useCallback(async () => {
    const state = stateRef.current;
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
  }, [applyCloudPayload, stateRef]);

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
      const merged = await pushCloudSave(toCloudPayload(stateRef.current));
      applyCloudPayload(merged);
      log.info('pullFromCloud:ok', { rolls: merged.lifetimeRollCount });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Pull failed';
      log.error('pullFromCloud:fail', { message });
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  }, [applyCloudPayload, stateRef]);

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
          history: [roll, ...base.history].slice(0, HISTORY_CAP),
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
        if (await isRollPublished(key)) {
          log.info('waitForCloudPublish:ok', { key, attempt });
          return 'ok';
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
    [applyCloudPayload, loggedInRef, stateRef],
  );

  return {
    syncing,
    lastSyncAt,
    syncError,
    applyCloudPayload,
    enqueueAutoSync,
    syncToCloud,
    pullFromCloud,
    waitForCloudPublish,
  };
}
