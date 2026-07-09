import type { CollectionEntry, PlayStats, RollResult } from '../game/types';
import { createLogger, withTimeout } from './logger';

const log = createLogger('sync-api');
const FETCH_MS = 20_000;

export type CloudSavePayload = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
};

export async function fetchCloudSave(): Promise<CloudSavePayload | null> {
  return log.time('GET /api/sync', async () => {
    const res = await withTimeout(
      fetch('/api/sync', { credentials: 'include' }),
      FETCH_MS,
      'fetchCloudSave',
    );
    log.debug('status', { status: res.status });
    if (res.status === 401) return null;
    if (!res.ok) {
      const text = await res.text();
      log.error('pull failed', { status: res.status, text });
      throw new Error(text || `Pull failed (${res.status})`);
    }
    const data = (await res.json()) as { cloud: CloudSavePayload | null };
    log.info('pull ok', {
      hasCloud: Boolean(data.cloud),
      rolls: data.cloud?.lifetimeRollCount,
    });
    return data.cloud;
  });
}

export async function pushCloudSave(
  payload: CloudSavePayload,
): Promise<CloudSavePayload> {
  return log.time('POST /api/sync', async () => {
    log.debug('push payload', {
      lifetimeEP: payload.lifetimeEP,
      rolls: payload.lifetimeRollCount,
      historyLen: payload.history.length,
    });
    const res = await withTimeout(
      fetch('/api/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      FETCH_MS,
      'pushCloudSave',
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
    const data = (await res.json()) as { cloud: CloudSavePayload };
    log.info('push ok', { rolls: data.cloud.lifetimeRollCount });
    return data.cloud;
  });
}
