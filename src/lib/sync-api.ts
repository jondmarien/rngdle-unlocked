import type { CollectionEntry, PlayStats, RollResult } from '../game/types';

export type CloudSavePayload = {
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  collection: CollectionEntry[];
  stats: PlayStats;
  history: RollResult[];
};

export async function fetchCloudSave(): Promise<CloudSavePayload | null> {
  const res = await fetch('/api/sync', { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { cloud: CloudSavePayload | null };
  return data.cloud;
}

export async function pushCloudSave(
  payload: CloudSavePayload,
): Promise<CloudSavePayload> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Sync failed (${res.status})`,
    );
  }
  const data = (await res.json()) as { cloud: CloudSavePayload };
  return data.cloud;
}
