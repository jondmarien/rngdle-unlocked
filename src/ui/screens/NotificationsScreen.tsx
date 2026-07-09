import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  ensureNotificationPermission,
  fetchNotifications,
  loadWebNotifyPref,
  markNotificationsRead,
  saveWebNotifyPref,
  type InboxItem,
} from '../../lib/notifications-api';

type Tab = 'activity' | 'system';

export function NotificationsScreen({
  onOpenHref,
  onGoAccount,
}: {
  onOpenHref?: (path: string) => void;
  onGoAccount?: () => void;
}) {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>('activity');
  const [activity, setActivity] = useState<InboxItem[]>([]);
  const [system, setSystem] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState({ activity: 0, system: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [webNotify, setWebNotify] = useState(() => loadWebNotifyPref());
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications();
      setActivity(data.activity);
      setSystem(data.system);
      setUnread(data.unread);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    void reload();
  }, [session?.user, reload]);

  const items = tab === 'activity' ? activity : system;

  const markOne = async (item: InboxItem) => {
    if (item.read) return;
    try {
      await markNotificationsRead({ ids: [item.id], tab: item.tab });
      await reload();
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await markNotificationsRead({ markAll: true, tab });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-[var(--prose-2)]">
          Sign in to see follows, activity, and system messages from the
          developer.
        </p>
        {onGoAccount && (
          <button
            type="button"
            className="rounded-md border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-sm font-semibold text-[var(--bg)]"
            onClick={onGoAccount}
          >
            Account
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-[var(--prose-2)]">
            Activity is personal (follows, unlocks, when someone overtakes your
            daily / weekly / all-time crown). System messages are broadcasts —
            including community crown notices — to everyone.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || items.every((i) => i.read)}
          onClick={() => void markAll()}
          className="rounded-md border border-[var(--outline)] px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Mark {tab} read
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--prose-2)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={webNotify}
          onChange={(e) => {
            const on = e.target.checked;
            if (on) {
              void ensureNotificationPermission().then((ok) => {
                saveWebNotifyPref(ok);
                setWebNotify(ok);
                if (!ok) {
                  setError(
                    'Browser blocked notifications. Allow them in site settings.',
                  );
                }
              });
            } else {
              saveWebNotifyPref(false);
              setWebNotify(false);
            }
          }}
        />
        <span>
          Also show desktop/browser notifications when this tab is open and
          something new arrives (optional; inbox always works in-app).
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('activity')}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            tab === 'activity'
              ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
              : 'border-[var(--outline)] text-[var(--prose-2)]'
          }`}
        >
          Activity
          {unread.activity > 0 ? ` (${unread.activity})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('system')}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            tab === 'system'
              ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
              : 'border-[var(--outline)] text-[var(--prose-2)]'
          }`}
        >
          System messages
          {unread.system > 0 ? ` (${unread.system})` : ''}
        </button>
      </div>

      {loading && (
        <p className="text-sm text-[var(--prose-2)]">Loading…</p>
      )}
      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-[var(--prose-2)]">
          {tab === 'activity'
            ? 'No activity yet. Follows, unlocks, and overtake alerts show up here.'
            : 'No system messages yet.'}
        </p>
      )}

      <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)] rounded-lg">
        {items.map((item) => (
          <li key={`${item.tab}-${item.id}`}>
            <button
              type="button"
              className={`w-full px-3 py-3 text-left hover:bg-[var(--surface-raised)] ${
                item.read ? 'opacity-70' : ''
              }`}
              onClick={() => {
                void markOne(item);
                if (item.href && onOpenHref) onOpenHref(item.href);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--prose)]">
                  {!item.read && (
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
                      aria-label="Unread"
                    />
                  )}
                  {item.title}
                </p>
                <time className="shrink-0 text-xs text-[var(--prose-2)]">
                  {formatWhen(item.createdAt)}
                </time>
              </div>
              {item.body && (
                <p className="mt-1 text-sm leading-snug text-[var(--prose-2)]">
                  {item.body}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
