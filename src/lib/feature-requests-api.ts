import { createLogger, withTimeout } from './logger';
import {
  featureRequestItemSchema,
  featureRequestListResponseSchema,
  featureRequestSubmitSchema,
  featureRequestEditSchema,
  featureRequestStatusSchema,
} from './schemas';
import type { z } from 'zod';

const log = createLogger('feature-requests-api');
const FETCH_MS = 15_000;

export type FeatureRequestItem = z.infer<typeof featureRequestItemSchema>;
export type FeatureRequestStatus = z.infer<typeof featureRequestStatusSchema>;
export type FeatureRequestSort = 'top' | 'newest';

export async function fetchFeatureRequests(opts: {
  sort?: FeatureRequestSort;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ items: FeatureRequestItem[]; sort: FeatureRequestSort }> {
  const q = new URLSearchParams({
    sort: opts.sort ?? 'top',
    limit: String(opts.limit ?? 50),
  });
  log.info('list:start', { sort: opts.sort ?? 'top' });
  const res = await withTimeout(
    fetch(`/api/feature-requests?${q}`, {
      signal: opts.signal,
      credentials: 'include',
    }),
    FETCH_MS,
    'feature requests list',
  );
  const raw: unknown = await res.json();
  if (!res.ok) {
    const err =
      raw && typeof raw === 'object' && 'error' in raw
        ? String((raw as { error?: string }).error ?? 'Failed to load')
        : 'Failed to load';
    throw new Error(err);
  }
  const parsed = featureRequestListResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid feature requests response');
  return {
    items: parsed.data.items,
    sort: parsed.data.sort === 'newest' ? 'newest' : 'top',
  };
}

export async function submitFeatureRequest(input: {
  title: string;
  description: string;
  tag?: string | null;
  imageUrl?: string | null;
}): Promise<FeatureRequestItem> {
  const body = featureRequestSubmitSchema.parse(input);
  log.info('submit:start');
  const res = await withTimeout(
    fetch('/api/feature-requests', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    FETCH_MS,
    'feature request submit',
  );
  const raw: unknown = await res.json();
  if (!res.ok) {
    const err =
      raw && typeof raw === 'object' && 'error' in raw
        ? String((raw as { error?: string }).error ?? 'Submit failed')
        : 'Submit failed';
    throw new Error(err);
  }
  const item =
    raw && typeof raw === 'object' && 'item' in raw
      ? (raw as { item: unknown }).item
      : raw;
  const parsed = featureRequestItemSchema.safeParse(item);
  if (!parsed.success) throw new Error('Invalid submit response');
  return parsed.data;
}

export async function editFeatureRequest(
  id: string,
  input: {
    title?: string;
    description?: string;
    tag?: string | null;
  },
): Promise<FeatureRequestItem> {
  const body = featureRequestEditSchema.parse(input);
  log.info('edit:start', { id });
  const res = await withTimeout(
    fetch(`/api/feature-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    FETCH_MS,
    'feature request edit',
  );
  const raw: unknown = await res.json();
  if (!res.ok) {
    const err =
      raw && typeof raw === 'object' && 'error' in raw
        ? String((raw as { error?: string }).error ?? 'Edit failed')
        : 'Edit failed';
    throw new Error(
      res.status === 429 ? err || 'Too many edits — try again later.' : err,
    );
  }
  const item =
    raw && typeof raw === 'object' && 'item' in raw
      ? (raw as { item: unknown }).item
      : raw;
  const parsed = featureRequestItemSchema.safeParse(item);
  if (!parsed.success) throw new Error('Invalid edit response');
  return parsed.data;
}

export async function uploadFeatureRequestImage(
  file: File,
): Promise<{ url: string }> {
  log.info('upload:start', { size: file.size, type: file.type });
  const form = new FormData();
  form.append('file', file);
  const res = await withTimeout(
    fetch('/api/feature-requests/upload', {
      method: 'POST',
      credentials: 'include',
      body: form,
    }),
    FETCH_MS,
    'feature request upload',
  );
  const data = (await res.json()) as { error?: string; url?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  if (!data.url) throw new Error('Upload missing url');
  return { url: data.url };
}

export async function upvoteFeatureRequest(
  id: string,
): Promise<{ voteCount: number }> {
  log.info('vote:start', { id });
  const res = await withTimeout(
    fetch(`/api/feature-requests/${encodeURIComponent(id)}/vote`, {
      method: 'POST',
      credentials: 'include',
    }),
    FETCH_MS,
    'feature request vote',
  );
  const data = (await res.json()) as {
    error?: string;
    voteCount?: number;
  };
  if (!res.ok) throw new Error(data.error ?? 'Vote failed');
  return { voteCount: data.voteCount ?? 0 };
}

export async function patchFeatureRequestStatus(
  id: string,
  status: FeatureRequestStatus,
): Promise<void> {
  log.info('admin:status', { id, status });
  const res = await withTimeout(
    fetch('/api/admin/feature-requests', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }),
    FETCH_MS,
    'feature request status',
  );
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Status update failed');
}

export async function deleteFeatureRequestAdmin(id: string): Promise<void> {
  log.info('admin:delete', { id });
  const res = await withTimeout(
    fetch('/api/admin/feature-requests', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    }),
    FETCH_MS,
    'feature request delete',
  );
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Delete failed');
}

export const FEATURE_STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Declined',
};
