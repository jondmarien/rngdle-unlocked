import { createLogger } from './logger';

const log = createLogger('admin-api');

async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<
  { ok: true; data: T } | { ok: false; error: string; status: number }
> {
  try {
    const res = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      log.warn('admin request failed', { path, status: res.status });
      return {
        ok: false,
        error: data.error ?? `HTTP ${res.status}`,
        status: res.status,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      status: 0,
    };
  }
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  lifetimeEp: number;
  lifetimeRollCount: number;
};

export type AdminReportRow = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string | null; email: string };
  target: { id: string; username: string | null; email: string };
};

/**
 * Admin probe — GET /api/admin/broadcast passes the role gate for admins
 * (a 405 means "authorized but wrong method", which still proves admin).
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/broadcast', {
      credentials: 'include',
    });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

export function searchAdminUsers(
  q: string,
  opts?: { page?: number; limit?: number },
) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  params.set('page', String(opts?.page ?? 1));
  params.set('limit', String(opts?.limit ?? 25));
  return adminFetch<{
    users: AdminUserRow[];
    total: number;
    page: number;
    limit: number;
  }>(`/api/admin/users?${params}`);
}

export function postBroadcast(title: string, body: string) {
  return adminFetch<{ ok: boolean; id: string }>('/api/admin/broadcast', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
}

export function wipeUser(userId: string) {
  return adminFetch<{ ok: boolean }>('/api/admin/users/wipe', {
    method: 'POST',
    body: JSON.stringify({ userId, confirm: 'wipe' }),
  });
}

export function banUser(userId: string, banned: boolean, reason?: string) {
  return adminFetch<{ ok: boolean }>('/api/admin/users/ban', {
    method: 'POST',
    body: JSON.stringify({ userId, banned, reason }),
  });
}

export function listReports(status = 'open') {
  return adminFetch<{ reports: AdminReportRow[] }>(
    `/api/admin/reports?status=${encodeURIComponent(status)}`,
  );
}

export function patchReport(id: string, status: 'resolved' | 'dismissed') {
  return adminFetch<{ ok: boolean }>('/api/admin/reports', {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  });
}

export function fileReport(input: {
  targetUserId?: string;
  targetUsername?: string;
  reason: string;
}) {
  return adminFetch<{ ok: boolean; id: string }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
