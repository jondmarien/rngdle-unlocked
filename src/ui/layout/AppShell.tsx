import type { ReactNode } from 'react';
import { useGame } from '../../state/GameProvider';
import { ThemeToggle } from './ThemeToggle';

export type TabId = 'home' | 'history' | 'collection' | 'about' | 'settings';

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Roll' },
  { id: 'history', label: 'History' },
  { id: 'collection', label: 'Collection' },
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
  const { settings, setTheme, lifetimeEP, lifetimeRollCount } = useGame();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--bg)] text-[var(--prose)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--outline)] px-3 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-lg font-bold tracking-[0.2em]"
            onClick={() => onTab('home')}
          >
            RNGdle Unlocked
          </button>
          <span className="hidden text-xs text-[var(--prose-3)] sm:inline">
            {lifetimeRollCount.toLocaleString()} rolls ·{' '}
            {lifetimeEP.toLocaleString()} life EP
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle value={settings.theme} onChange={setTheme} />
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--outline)] px-2 py-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
              tab === t.id
                ? 'border-b-2 border-[var(--prose)] text-[var(--prose)]'
                : 'text-[var(--prose-3)] hover:text-[var(--prose)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
    </div>
  );
}
