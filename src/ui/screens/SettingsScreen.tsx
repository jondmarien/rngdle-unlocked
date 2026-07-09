import { useRef, useState } from 'react';
import { useGame } from '../../state/GameProvider';
import { ThemeToggle } from '../layout/ThemeToggle';

export function SettingsScreen() {
  const {
    settings,
    setTheme,
    setShareShowRollCount,
    setSoundEnabled,
    setConfettiEnabled,
    clearAll,
    exportSave,
    importSave,
    lifetimeEP,
    lifetimeRollCount,
    journeyEP,
    stats,
  } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importSave(file);
      setImportMsg('Save imported successfully.');
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import failed');
    }
  };

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
          Effects (optional)
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.confettiEnabled}
            onChange={(e) => setConfettiEnabled(e.target.checked)}
          />
          Confetti on rare+ rolls
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          Soft sound on roll settle
        </label>
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
        <p className="text-xs text-[var(--prose-3)]">
          Public vanity links require an account and a confirmed cloud sync.
          Logged-out share is Discord text / PNG only.
        </p>
      </section>

      <section className="space-y-1 text-sm text-[var(--prose-2)]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Stats
        </h2>
        <p>Lifetime rolls: {lifetimeRollCount.toLocaleString()}</p>
        <p>Lifetime EP: {lifetimeEP.toLocaleString()}</p>
        <p>Journey EP: {journeyEP.toLocaleString()}</p>
        <p>
          Day streak: {stats.dayStreak} (best {stats.bestDayStreak})
        </p>
        <p>
          Quality streak: {stats.qualityStreak} (best {stats.bestQualityStreak})
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Export / import
        </h2>
        <p className="text-xs text-[var(--prose-3)]">
          Download a JSON save of history, collection, stats, and settings — or
          restore from a previous export.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
            onClick={exportSave}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
            onClick={() => fileRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
        </div>
        {importMsg && (
          <p className="text-xs text-[var(--prose-2)]">{importMsg}</p>
        )}
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

      <p className="text-xs text-[var(--prose-3)]">RNGdle Unlocked v0.2.0</p>
    </div>
  );
}
