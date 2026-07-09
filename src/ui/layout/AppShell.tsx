import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  fetchNotifications,
  loadWebNotifyPref,
  showBrowserNotification,
} from '../../lib/notifications-api';
import { tabPath, type TabId } from '../../lib/routes';
import { useGame } from '../../state/GameProvider';
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
  { kind: 'profile', label: 'Profile' },
  { kind: 'tab', id: 'account', label: 'Account' },
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
  const { settings, setTheme, lifetimeEP, lifetimeRollCount, stats } =
    useGame();
  const { data: session } = useSession();
  const [unread, setUnread] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const lastUnread = useRef(0);

  useEffect(() => {
    if (!session?.user) {
      setUnread(0);
      lastUnread.current = 0;
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await fetchNotifications();
        if (cancelled) return;
        const total = data.unread.total;
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
        setUnread(total);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session?.user, tab, profileActive]);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetch('/api/admin/broadcast', { credentials: 'include' })
      .then((r) => {
        if (!cancelled) setIsAdmin(r.ok || r.status === 405);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const myUsername =
    (session?.user as { username?: string | null } | undefined)?.username ??
    null;

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
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--prose)]">
      {/* Sticky chrome: brand bar + nav stay visible while content scrolls */}
      <div className="sticky top-0 z-40 border-b border-[var(--outline)] bg-[var(--bg)]/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-[var(--bg)]/85">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <a
              href={tabPath('home')}
              className="font-display text-base font-bold tracking-wide sm:text-lg"
              onClick={(e) => {
                e.preventDefault();
                onTab('home');
              }}
            >
              RNGdle Unlocked
            </a>
            <span className="text-sm text-[var(--prose-2)]">
              {lifetimeRollCount.toLocaleString()} rolls ·{' '}
              {lifetimeEP.toLocaleString()} EP
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
                onClick={() => onTab('notifications')}
                className={`relative rounded-md border px-2.5 py-1.5 text-sm font-semibold ${
                  tab === 'notifications'
                    ? 'border-[var(--prose)] bg-[var(--surface-raised)]'
                    : 'border-[var(--outline)]'
                }`}
              >
                Alerts
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-bold text-white">
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
                    ? 'bg-[var(--surface-raised)] text-[var(--prose)]'
                    : 'text-[var(--prose-2)] hover:bg-[var(--surface)] hover:text-[var(--prose)]'
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
                  ? 'bg-[var(--surface-raised)] text-[var(--prose)]'
                  : 'text-[var(--prose-2)] hover:bg-[var(--surface)] hover:text-[var(--prose)]'
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
