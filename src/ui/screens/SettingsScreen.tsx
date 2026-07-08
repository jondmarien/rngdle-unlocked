import { useState } from 'react';
import { useGame } from '../../state/GameProvider';
import { ThemeToggle } from '../layout/ThemeToggle';

export function SettingsScreen() {
  const {
    settings,
    setTheme,
    setShareShowRollCount,
    clearAll,
    lifetimeEP,
    lifetimeRollCount,
    journeyEP,
  } = useGame();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold uppercase tracking-wider">Settings</h1>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Theme
        </h2>
        <ThemeToggle value={settings.theme} onChange={setTheme} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Share
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.shareShowRollCount}
            onChange={(e) => setShareShowRollCount(e.target.checked)}
          />
          Include lifetime roll count on share cards
        </label>
      </section>

      <section className="space-y-1 text-sm text-[var(--prose-2)]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Stats
        </h2>
        <p>Lifetime rolls: {lifetimeRollCount.toLocaleString()}</p>
        <p>Lifetime EP: {lifetimeEP.toLocaleString()}</p>
        <p>Journey EP (subset): {journeyEP.toLocaleString()}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Data
        </h2>
        {!confirm ? (
          <button
            type="button"
            className="border border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700"
            onClick={() => setConfirm(true)}
          >
            Clear all data
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-red-700 px-3 py-2 text-xs font-bold uppercase text-white"
              onClick={() => {
                clearAll();
                setConfirm(false);
              }}
            >
              Confirm clear
            </button>
            <button
              type="button"
              className="border border-[var(--outline)] px-3 py-2 text-xs font-bold uppercase"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      <p className="text-xs text-[var(--prose-3)]">RNGdle Unlocked v0.1.0</p>
    </div>
  );
}
