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
  pushCloudDelta,
  type CloudSavePayload,
  type SyncAck,
} from '../lib/sync-api';
import {
  backfillCollectionTimestamps,
  HISTORY_CAP,
  type PersistedState,
} from './storage';
import {
  applyAckToMeta,
  buildDeltaPayload,
  loadSyncMeta,
  saveSyncMeta,
  type SyncDeltaPayload,
} from './syncMeta';
import { mergeCollection, mergeHistory, mergeStats } from '../lib/sync-merge';

const log = createLogger('game');
const AUTO_SYNC_DEBOUNCE_MS = 12_000;

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

function mergeLocalWithCloud(
  local: PersistedState,
  cloud: CloudSavePayload,
): CloudSavePayload {
  return {
    lifetimeEP: Math.max(local.lifetimeEP, cloud.lifetimeEP),
    lifetimeRollCount: Math.max(
      local.lifetimeRollCount,
      cloud.lifetimeRollCount,
    ),
    journeyEP: Math.max(local.journeyEP, cloud.journeyEP),
    collection: mergeCollection(local.collection, cloud.collection),
    stats: mergeStats(local.stats, cloud.stats),
    history: mergeHistory(local.history, cloud.history),
  };
}

export type SyncControls = {
  syncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  syncToCloud: () => Promise<void>;
  pullFromCloud: (opts?: { quietEmpty?: boolean }) => Promise<void>;
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
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const applySyncAck = useCallback(
    (ack: SyncAck, sent: SyncDeltaPayload) => {
      const state = stateRef.current;
      const meta = applyAckToMeta(
        loadSyncMeta(),
        ack.updatedAt,
        sent,
        new Set(state.history.map((r) => r.id)),
      );
      saveSyncMeta(meta);

      setState((prev) => {
        const next: PersistedState = {
          ...prev,
          lifetimeEP: Math.max(prev.lifetimeEP, ack.counts.lifetimeEP),
          lifetimeRollCount: Math.max(
            prev.lifetimeRollCount,
            ack.counts.lifetimeRollCount,
          ),
          journeyEP: Math.max(prev.journeyEP, ack.counts.journeyEP),
        };
        persist(next);
        return next;
      });
      setLastSyncAt(new Date().toISOString());
    },
    [persist, setState, stateRef],
  );

  const pushDeltaFrom = useCallback(
    async (payload: CloudSavePayload, forceRoll?: RollResult) => {
      const meta = loadSyncMeta();
      let delta = buildDeltaPayload(payload, meta);
      if (forceRoll && !delta.history.some((r) => r.id === forceRoll.id)) {
        delta = {
          ...delta,
          history: [forceRoll, ...delta.history].slice(0, 60),
        };
      }
      const ack = await pushCloudDelta(delta);
      applySyncAck(ack, delta);
      return ack;
    },
    [applySyncAck],
  );

  const enqueueAutoSync = useCallback(
    (payload: CloudSavePayload) => {
      if (!loggedInRef.current) return;
      latestAutoPayload.current = payload;

      if (autoSyncTimer.current) {
        clearTimeout(autoSyncTimer.current);
      }

      autoSyncTimer.current = setTimeout(() => {
        autoSyncTimer.current = null;
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
              let ack = await pushDeltaFrom(p);
              if (latestAutoPayload.current === p) {
                setSyncError(null);
              }
              // Drain remaining pending rolls (UPSERT_CAP batches) in this tick
              let guard = 0;
              while (guard < 10 && latestAutoPayload.current === p) {
                guard += 1;
                const still = buildDeltaPayload(
                  latestAutoPayload.current,
                  loadSyncMeta(),
                );
                if (
                  still.history.length === 0 &&
                  still.collection.length === 0
                ) {
                  break;
                }
                ack = await pushDeltaFrom(latestAutoPayload.current);
              }
              log.info('autoSync:ok', { rolls: ack.counts.lifetimeRollCount });
            } catch (e) {
              const message =
                e instanceof Error ? e.message : 'Auto-sync failed';
              log.error('autoSync:fail', { message });
              setSyncError(message);
            } finally {
              setSyncing(false);
            }
          })
          .catch(() => {
            /* chain must not break */
          });
      }, AUTO_SYNC_DEBOUNCE_MS);
    },
    [loggedInRef, pushDeltaFrom],
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
      // Drain pending in batches of UPSERT_CAP
      let guard = 0;
      while (guard < 20) {
        guard += 1;
        const payload = toCloudPayload(stateRef.current);
        const pending = buildDeltaPayload(payload, loadSyncMeta());
        if (
          pending.history.length === 0 &&
          pending.collection.length === 0 &&
          guard > 1
        ) {
          break;
        }
        const ack = await pushDeltaFrom(payload);
        log.info('syncToCloud:batch', {
          upserted: ack.counts.historyUpserted,
          pending: pending.history.length,
        });
        if (pending.history.length < 60) break;
      }
      setSyncError(null);
      log.info('syncToCloud:ok');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed';
      log.error('syncToCloud:fail', { message });
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  }, [pushDeltaFrom, stateRef]);

  const pullFromCloud = useCallback(
    async (opts?: { quietEmpty?: boolean }) => {
      setSyncing(true);
      setSyncError(null);
      log.info('pullFromCloud:start');
      try {
        const { cloud, updatedAt } = await fetchCloudSave();
        if (!cloud) {
          log.warn('pullFromCloud:empty');
          if (!opts?.quietEmpty) {
            setSyncError('Nothing in the cloud yet — push first.');
          }
          return;
        }
        const local = stateRef.current;
        const merged = mergeLocalWithCloud(local, cloud);
        applyCloudPayload(merged);

        // Seed cursor; mark cloud history as acked so we don't re-upload it.
        // Local-only rolls stay unacked and drain via follow-up delta.
        const cloudIds = new Set(cloud.history.map((r) => r.id));
        const localOnly = local.history.filter((r) => !cloudIds.has(r.id));
        saveSyncMeta({
          cursorUpdatedAt: updatedAt,
          ackedRollIds: cloud.history.map((r) => r.id),
          ackedBadgeIds: cloud.collection.map((c) => c.badgeId).filter(Boolean),
        });

        if (localOnly.length > 0) {
          // Upload device-local exclusives as delta — never full 500 POST.
          enqueueAutoSync(merged);
        }

        log.info('pullFromCloud:ok', {
          rolls: merged.lifetimeRollCount,
          localOnly: localOnly.length,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Pull failed';
        log.error('pullFromCloud:fail', { message });
        setSyncError(message);
      } finally {
        setSyncing(false);
      }
    },
    [applyCloudPayload, enqueueAutoSync, stateRef],
  );

  const waitForCloudPublish = useCallback(
    async (roll: RollResult): Promise<'ok' | 'error' | 'logged-out'> => {
      if (!loggedInRef.current) return 'logged-out';
      if (autoSyncTimer.current) {
        clearTimeout(autoSyncTimer.current);
        autoSyncTimer.current = null;
      }
      await autoSyncChain.current.catch(() => {});
      const key = roll.shortCode || roll.id;

      try {
        setSyncing(true);
        const base = toCloudPayload(stateRef.current);
        const withRoll = base.history.some((r) => r.id === roll.id)
          ? base
          : {
              ...base,
              history: [roll, ...base.history].slice(0, HISTORY_CAP),
            };
        // Ensure this roll is treated as pending even if previously acked
        const meta = loadSyncMeta();
        saveSyncMeta({
          ...meta,
          ackedRollIds: meta.ackedRollIds.filter((id) => id !== roll.id),
        });
        await pushDeltaFrom(withRoll, roll);
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
        await new Promise((r) => setTimeout(r, 400 + attempt * 150));
      }
      log.error('waitForCloudPublish:exhausted', { key });
      return 'error';
    },
    [loggedInRef, pushDeltaFrom, stateRef],
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
