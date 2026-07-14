import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  countGroupedUnread,
  groupInboxItems,
} from '../../lib/inboxPresentation';
import {
  ensureNotificationPermission,
  fetchNotifications,
  loadWebNotifyPref,
  markNotificationsRead,
  NOTIFICATIONS_QUERY_KEY,
  saveWebNotifyPref,
} from '../../lib/notifications-api';
import {
  NotificationRow,
  NotificationSkeleton,
} from '../components/NotificationRow';
import { SegmentedToggle } from '../components/SegmentedToggle';

type Tab = 'activity' | 'system';

export function NotificationsScreen({
  onOpenHref,
  onGoAccount,
}: {
  onOpenHref?: (path: string) => void;
  onGoAccount?: () => void;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('activity');
  const [error, setError] = useState<string | null>(null);
  const [webNotify, setWebNotify] = useState(() => loadWebNotifyPref());
  const [busy, setBusy] = useState(false);
  /** Prevent concurrent auto-clear of system inbox. */
  const clearingSystem = useRef(false);

  const inboxQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchNotifications,
    enabled: Boolean(session?.user),
    refetchInterval: 45_000,
  });

  const activity = inboxQuery.data?.activity ?? [];
  const system = inboxQuery.data?.system ?? [];
  const loading = inboxQuery.isPending;
  const queryError =
    error ??
    (inboxQuery.error instanceof Error ? inboxQuery.error.message : null);

  const invalidateInbox = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const activityPresentations = useMemo(
    () => groupInboxItems(activity),
    [activity],
  );
  const systemPresentations = useMemo(() => groupInboxItems(system), [system]);
  const displayUnread = useMemo(
    () => countGroupedUnread({ activity, system }),
    [activity, system],
  );

  /**
   * Viewing System messages marks the whole system inbox read —
   * no need to click each crown notice.
   */
  useEffect(() => {
    if (!session?.user || tab !== 'system' || loading) return;
    if (displayUnread.system <= 0) return;
    if (clearingSystem.current) return;
    clearingSystem.current = true;
    void markNotificationsRead({ markAll: true, tab: 'system' })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
      )
      .catch(() => {
        /* keep unread if mark failed */
      })
      .finally(() => {
        clearingSystem.current = false;
      });
  }, [session?.user, tab, loading, displayUnread.system, queryClient]);

  const presentations =
    tab === 'activity' ? activityPresentations : systemPresentations;
  const rawItems = tab === 'activity' ? activity : system;

  const markMany = async (ids: string[], href: string | null, itemTab: Tab) => {
    const unreadIds = ids.filter((id) => {
      const row = (itemTab === 'activity' ? activity : system).find(
        (i) => i.id === id,
      );
      return row && !row.read;
    });
    if (unreadIds.length > 0) {
      try {
        await markNotificationsRead({ ids: unreadIds, tab: itemTab });
        await invalidateInbox();
      } catch {
        /* ignore */
      }
    }
    if (href && onOpenHref) onOpenHref(href);
  };

  const markAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await markNotificationsRead({ markAll: true, tab });
      await invalidateInbox();
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
        <p className="text-sm text-(--prose-2)">
          Sign in to see follows, activity, and system messages from the
          developer.
        </p>
        {onGoAccount && (
          <button
            type="button"
            className="rounded-md border-2 border-(--accent) bg-(--accent) px-3 py-2 text-sm font-semibold text-(--bg)"
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
          <p className="text-sm text-(--prose-2)">
            Activity is personal (follows, unlocks, when someone overtakes your
            daily / weekly / all-time crown). System messages are broadcasts —
            including community crown notices — to everyone. Opening System
            messages marks them all read.
          </p>
        </div>
        {tab === 'activity' && (
          <button
            type="button"
            disabled={busy || rawItems.every((i) => i.read)}
            onClick={() => void markAll()}
            className="rounded-md border border-(--outline) px-3 py-2 text-sm font-semibold transition-opacity hover:border-(--prose-2) disabled:opacity-40"
          >
            Mark activity read
          </button>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-sm text-(--prose-2)">
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
        <SegmentedToggle
          className="contents"
          chipClassName="rounded-md border px-3 py-2 text-sm font-semibold"
          options={[
            {
              id: 'activity',
              label: `Activity${displayUnread.activity > 0 ? ` (${displayUnread.activity})` : ''}`,
            },
            {
              id: 'system',
              label: `System messages${displayUnread.system > 0 ? ` (${displayUnread.system})` : ''}`,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {loading && <NotificationSkeleton />}
      {queryError && (
        <p className="text-sm text-red-700 dark:text-red-400">{queryError}</p>
      )}

      {!loading && presentations.length === 0 && (
        <div className="rounded-lg border border-(--outline) bg-(--surface) px-4 py-6 text-center">
          <p className="text-sm text-(--prose-2)">
            {tab === 'activity'
              ? 'No activity yet. Follows, unlocks, and overtake alerts land here.'
              : 'No system messages yet.'}
          </p>
        </div>
      )}

      {!loading && presentations.length > 0 && (
        <ul className="divide-y divide-(--outline) overflow-hidden rounded-lg border border-(--outline)">
          {presentations.map((p) => (
            <NotificationRow
              key={p.key}
              presentation={p}
              onActivate={(ids, href, itemTab) =>
                void markMany(ids, href, itemTab)
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
