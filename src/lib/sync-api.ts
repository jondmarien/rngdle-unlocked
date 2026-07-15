import type { CollectionEntry, PlayStats, RollResult } from '../game/types';
import { createLogger, withTimeout } from './logger';
import type { SyncDeltaPayload } from '../state/syncMeta';

const log = createLogger('sync-api');
const FETCH_MS = 20_000;

export type CloudSavePayload = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
  settings?: Partial<import('../game/types').AppSettings>;
  settingsUpdatedAt?: string;
};

export type CloudSaveFetch = {
  cloud: CloudSavePayload | null;
  updatedAt: string | null;
  settingsSyncEnabled: boolean;
};

export type SyncAck = {
  ok: true;
  updatedAt: string;
  counts: {
    lifetimeEP: number;
    lifetimeRollCount: number;
    journeyEP: number;
    collectionCount: number;
    historyUpserted: number;
  };
};

export async function fetchCloudSave(): Promise<CloudSaveFetch> {
  return log.time('GET /api/sync', async () => {
    const res = await withTimeout(
      fetch('/api/sync', { credentials: 'include' }),
      FETCH_MS,
      'fetchCloudSave',
    );
    log.debug('status', { status: res.status });
    if (res.status === 401) {
      return { cloud: null, updatedAt: null, settingsSyncEnabled: false };
    }
    if (!res.ok) {
      const text = await res.text();
      log.error('pull failed', { status: res.status, text });
      throw new Error(text || `Pull failed (${res.status})`);
    }
    const data = (await res.json()) as {
      cloud: CloudSavePayload | null;
      updatedAt?: string | null;
      settingsSyncEnabled?: boolean;
    };
    log.info('pull ok', {
      hasCloud: Boolean(data.cloud),
      rolls: data.cloud?.lifetimeRollCount,
      settingsSyncEnabled: Boolean(data.settingsSyncEnabled),
    });
    return {
      cloud: data.cloud,
      updatedAt: data.updatedAt ?? null,
      settingsSyncEnabled: Boolean(data.settingsSyncEnabled),
    };
  });
}

export async function pushCloudDelta(
  payload: SyncDeltaPayload,
): Promise<SyncAck> {
  return log.time('POST /api/sync (delta)', async () => {
    log.debug('push delta', {
      lifetimeEP: payload.lifetimeEP,
      rolls: payload.lifetimeRollCount,
      historyLen: payload.history.length,
      collectionLen: payload.collection.length,
    });
    const res = await withTimeout(
      fetch('/api/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      FETCH_MS,
      'pushCloudDelta',
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      const message = err.detail
        ? `${err.error ?? 'Sync failed'}: ${err.detail}`
        : (err.error ?? `Sync failed (${res.status})`);
      log.error('push failed', { status: res.status, message });
      throw new Error(message);
    }
    const data = (await res.json()) as SyncAck;
    log.info('push ok', {
      rolls: data.counts.lifetimeRollCount,
      upserted: data.counts.historyUpserted,
    });
    return data;
  });
}
