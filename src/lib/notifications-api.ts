export type InboxItem = {
  id: string;
  tab: 'activity' | 'system';
  kind: string;
  title: string;
  body: string;
  href: string | null;
  actorUsername: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationsPayload = {
  activity: InboxItem[];
  system: InboxItem[];
  unread: { activity: number; system: number; total: number };
};

export async function fetchNotifications(): Promise<NotificationsPayload> {
  const res = await fetch('/api/notifications', { credentials: 'include' });
  const data = (await res.json()) as NotificationsPayload & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to load notifications');
  return data;
}

export async function markNotificationsRead(opts: {
  ids?: string[];
  markAll?: boolean;
  tab?: 'activity' | 'system' | 'all';
}): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? 'Failed to mark read');
  }
}

export async function searchUsers(
  q: string,
): Promise<{ username: string; name: string }[]> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
    credentials: 'include',
  });
  const data = (await res.json()) as {
    users?: { username: string; name: string }[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? 'Search failed');
  return data.users ?? [];
}

export async function followUser(
  username: string,
): Promise<{ created: boolean }> {
  const res = await fetch('/api/follow', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const data = (await res.json()) as {
    error?: string;
    created?: boolean;
  };
  if (!res.ok) throw new Error(data.error ?? 'Follow failed');
  return { created: Boolean(data.created) };
}

export async function unfollowUser(username: string): Promise<void> {
  const res = await fetch(
    `/api/follow?username=${encodeURIComponent(username)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? 'Unfollow failed');
  }
}

export async function fetchFollowingUsernames(): Promise<Set<string>> {
  const res = await fetch('/api/follow', { credentials: 'include' });
  if (!res.ok) return new Set();
  const data = (await res.json()) as {
    following?: { username: string | null }[];
  };
  return new Set(
    (data.following ?? [])
      .map((f) => f.username?.toLowerCase())
      .filter((u): u is string => Boolean(u)),
  );
}

const WEB_NOTIFY_KEY = 'rngdle-unlocked:v1:webNotifications';

export function loadWebNotifyPref(): boolean {
  try {
    return localStorage.getItem(WEB_NOTIFY_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveWebNotifyPref(on: boolean): void {
  try {
    localStorage.setItem(WEB_NOTIFY_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const r = await Notification.requestPermission();
  return r === 'granted';
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!loadWebNotifyPref()) return;
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch {
    /* ignore */
  }
}
