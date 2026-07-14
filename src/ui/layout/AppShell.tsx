import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../../lib/auth-client';
import { countGroupedUnread } from '../../lib/inboxPresentation';
import {
  fetchNotifications,
  loadWebNotifyPref,
  NOTIFICATIONS_QUERY_KEY,
  showBrowserNotification,
} from '../../lib/notifications-api';
import { tabPath, type TabId } from '../../lib/routes';
import { useIsAdmin } from '../../lib/useIsAdmin';
import {
  clearViewAs,
  getViewAsUsername,
  VIEW_AS_EVENT,
} from '../../lib/view-as';
import { useGame, useGameSettings } from '../../state/GameProvider';
import { FormattedCount } from '../components/FormattedCount';
import { ThemeToggle } from './ThemeToggle';

export type { TabId };

type NavItem =
  | { kind: 'tab'; id: TabId; label: string }
  | { kind: 'profile'; label: string };

/** Main strip — Alerts lives in the header only. Admin inserted when allowed. */
const NAV_BASE: NavItem[] = [
  { kind: 'tab', id: 'home', label: 'Roll' },
  { kind: 'tab', id: 'history', label: 'History' },
  { kind: 'tab', id: 'collection', label: 'Codex' },
  { kind: 'tab', id: 'showcase', label: 'Showcase' },
  { kind: 'tab', id: 'stats', label: 'Stats' },
  { kind: 'tab', id: 'leaderboard', label: 'Board' },
  { kind: 'tab', id: 'friends', label: 'Friends' },
  { kind: 'tab', id: 'arcade', label: 'Arcade' },
  { kind: 'tab', id: 'features', label: 'Features' },
  { kind: 'profile', label: 'Profile' },
  { kind: 'tab', id: 'account', label: 'Account' },
  { kind: 'tab', id: 'whats-new', label: "What's new" },
  { kind: 'tab', id: 'about', label: 'About' },
  { kind: 'tab', id: 'settings', label: 'Settings' },
];

export function AppShell({
  tab,
  onTab,
  onOpenMyProfile,
  profileActive = false,
  children,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  /** Open /u/me or Account if no username yet */
  onOpenMyProfile?: () => void;
  profileActive?: boolean;
  children: ReactNode;
}) {
  const { lifetimeEP, lifetimeRollCount, stats } = useGame();
  const { settings, setTheme } = useGameSettings();
  const { data: session } = useSession();
  const { isAdmin } = useIsAdmin(session?.user?.id);
  const lastUnread = useRef(0);
  const [viewAsUsername, setViewAsUsername] = useState(getViewAsUsername);

  useEffect(() => {
    const sync = () => setViewAsUsername(getViewAsUsername());
    window.addEventListener(VIEW_AS_EVENT, sync);
    return () => window.removeEventListener(VIEW_AS_EVENT, sync);
  }, []);

  const inboxQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchNotifications,
    enabled: Boolean(session?.user),
    refetchInterval: 45_000,
  });

  const unread = session?.user
    ? countGroupedUnread({
        activity: inboxQuery.data?.activity ?? [],
        system: inboxQuery.data?.system ?? [],
      }).total
    : 0;

  useEffect(() => {
    if (!session?.user || !inboxQuery.data) return;
    const data = inboxQuery.data;
    const total = countGroupedUnread({
      activity: data.activity,
      system: data.system,
    }).total;
    if (
      total > lastUnread.current &&
      lastUnread.current >= 0 &&
      loadWebNotifyPref()
    ) {
      const newest =
        [...data.activity, ...data.system]
          .filter((i) => !i.read)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
      if (newest) {
        showBrowserNotification(newest.title, newest.body);
      }
    }
    lastUnread.current = total;
  }, [session?.user, inboxQuery.data]);

  useEffect(() => {
    if (!session?.user) {
      lastUnread.current = 0;
    }
  }, [session?.user]);

  const myUsername = session?.user.username ?? null;

  const navItems: NavItem[] = (() => {
    if (!isAdmin) return NAV_BASE;
    const items = [...NAV_BASE];
    const settingsIdx = items.findIndex(
      (i) => i.kind === 'tab' && i.id === 'settings',
    );
    const adminItem: NavItem = { kind: 'tab', id: 'admin', label: 'Admin' };
    if (settingsIdx === -1) {
      items.push(adminItem);
      return items;
    }
    items.splice(settingsIdx, 0, adminItem);
    return items;
  })();

  return (
    <div className="flex min-h-dvh flex-col bg-(--bg) text-(--prose)">
      {/* Sticky chrome: brand bar + nav stay visible while content scrolls */}
      <div className="sticky top-0 z-40 border-b border-(--outline) bg-(--bg) shadow-sm backdrop-blur-md">
        {isAdmin && viewAsUsername && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Viewing site as @{viewAsUsername}{' '}
              <span className="font-normal text-amber-800/90 dark:text-amber-300/90">
                (read-only public surfaces — you are still admin)
              </span>
            </p>
            <button
              type="button"
              className="rounded-md border border-amber-600/50 bg-(--surface) px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-200"
              onClick={() => {
                clearViewAs();
                onTab('admin');
              }}
            >
              Exit view as
            </button>
          </div>
        )}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <a
              href={tabPath('home')}
              className="font-display text-base font-bold tracking-wide hover:text-(--accent) sm:text-lg"
              onClick={(e) => {
                e.preventDefault();
                onTab('home');
              }}
            >
              RNGdle Unlocked
            </a>
            <span className="text-sm text-(--prose-2)">
              <FormattedCount value={lifetimeRollCount} /> rolls ·{' '}
              <FormattedCount value={lifetimeEP} /> EP
              {stats.dayStreak > 0 ? ` · ${stats.dayStreak}d streak` : ''}
              {stats.qualityStreak > 0
                ? ` · ${stats.qualityStreak} quality`
                : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {session?.user && (
              <button
                type="button"
                title="Notifications"
                aria-label={
                  unread > 0
                    ? `Notifications, ${unread} unread`
                    : 'Notifications'
                }
                onClick={() => onTab('notifications')}
                className={`relative rounded-md border px-2.5 py-1.5 text-sm font-semibold ${
                  tab === 'notifications'
                    ? 'border-(--accent) bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-(--accent)'
                    : 'border-(--outline)'
                }`}
              >
                Alerts
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--accent) px-1 text-[11px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            )}
            <ThemeToggle value={settings.theme} onChange={setTheme} />
          </div>
        </header>

        <nav
          className="flex gap-0.5 overflow-x-auto px-2 py-1.5 sm:px-3"
          aria-label="Main"
        >
          {navItems.map((item) => {
            if (item.kind === 'profile') {
              const href = myUsername
                ? `/u/${encodeURIComponent(myUsername)}`
                : tabPath('account');
              return (
                <a
                  key="profile"
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenMyProfile?.();
                  }}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold tracking-wide ${
                    profileActive
                      ? 'bg-(--accent) text-(--bg)'
                      : 'text-(--prose-2) hover:bg-(--surface) hover:text-(--prose)'
                  }`}
                >
                  {item.label}
                </a>
              );
            }
            // Don't highlight other tabs as active when viewing a profile
            const active = !profileActive && tab === item.id;
            return (
              <a
                key={item.id}
                href={tabPath(item.id)}
                onClick={(e) => {
                  e.preventDefault();
                  onTab(item.id);
                }}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold tracking-wide ${
                  active
                    ? 'bg-(--accent) text-(--bg)'
                    : 'text-(--prose-2) hover:bg-(--surface) hover:text-(--prose)'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-5">
        {children}
      </main>
    </div>
  );
}
