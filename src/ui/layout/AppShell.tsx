import type { ReactNode } from 'react';
import { tabPath, type TabId } from '../../lib/routes';
import { useGame } from '../../state/GameProvider';
import { ThemeToggle } from './ThemeToggle';

export type { TabId };

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Roll' },
  { id: 'history', label: 'History' },
  { id: 'collection', label: 'Codex' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'stats', label: 'Stats' },
  { id: 'leaderboard', label: 'Board' },
  { id: 'account', label: 'Account' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
];

export function AppShell({
  tab,
  onTab,
  children,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  children: ReactNode;
}) {
  const { settings, setTheme, lifetimeEP, lifetimeRollCount, stats } = useGame();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--prose)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--outline)] px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <a
            href={tabPath('home')}
            className="text-base font-bold tracking-wide sm:text-lg"
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
          <ThemeToggle value={settings.theme} onChange={setTheme} />
        </div>
      </header>

      <nav
        className="flex gap-0.5 overflow-x-auto border-b border-[var(--outline)] px-2 py-1.5 sm:px-3"
        aria-label="Main"
      >
        {TABS.map((t) => (
          <a
            key={t.id}
            href={tabPath(t.id)}
            onClick={(e) => {
              e.preventDefault();
              onTab(t.id);
            }}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold tracking-wide ${
              tab === t.id
                ? 'bg-[var(--surface-raised)] text-[var(--prose)]'
                : 'text-[var(--prose-2)] hover:bg-[var(--surface)] hover:text-[var(--prose)]'
            }`}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-5">
        {children}
      </main>
    </div>
  );
}
