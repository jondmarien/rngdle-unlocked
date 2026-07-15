import { useRef, useState } from 'react';
import { APP_VERSION } from '../../lib/app-version';
import { useGame, useGameSettings } from '../../state/GameProvider';
import { FormattedCount } from '../components/FormattedCount';
import { ThemeToggle } from '../layout/ThemeToggle';

export function SettingsScreen() {
  const {
    clearAll,
    exportSave,
    importSave,
    lifetimeEP,
    lifetimeRollCount,
    journeyEP,
    stats,
  } = useGame();
  const {
    settings,
    setTheme,
    setShareShowRollCount,
    setSoundEnabled,
    setHapticsEnabled,
    setConfettiEnabled,
    setTrashCrackEnabled,
    setAutoScrollBadges,
    setAutoShareHighRarity,
    setShowLatestRuns,
    setShareShowUnlockedBadges,
    setAbbreviateLargeNumbers,
    setApplyProfileAccentSiteWide,
  } = useGameSettings();
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
          Theme
        </h2>
        <ThemeToggle value={settings.theme} onChange={setTheme} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
          Effects (optional)
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.confettiEnabled}
            onChange={(e) => setConfettiEnabled(e.target.checked)}
          />
          Celebrate rare+ (confetti, edge glow, screen shake on epic+)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.trashCrackEnabled !== false}
            onChange={(e) => setTrashCrackEnabled(e.target.checked)}
          />
          Trash crack (cracked screen + heavy shake)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          Soft sound (Home + Arcade)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.hapticsEnabled === true}
            onChange={(e) => setHapticsEnabled(e.target.checked)}
          />
          Vibration feedback (mobile)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoScrollBadges !== false}
            onChange={(e) => setAutoScrollBadges(e.target.checked)}
          />
          Auto-scroll as badge breakdown unlocks
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoShareHighRarity === true}
            onChange={(e) => setAutoShareHighRarity(e.target.checked)}
          />
          Auto-open share after anomaly / mythic / divine rolls
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.showLatestRuns !== false}
            onChange={(e) => setShowLatestRuns(e.target.checked)}
          />
          Show Latest runs on the Roll tab
        </label>
        <p className="text-xs text-(--prose-3)">
          Scroll, share, Latest runs, and vibration prefs save on this device
          (localStorage). Optional cloud sync for Settings lives under Account →
          Cloud sync (off by default). Auto-share is off by default so a quick
          re-roll never steals a popup.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
          Display
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.abbreviateLargeNumbers === true}
            onChange={(e) => setAbbreviateLargeNumbers(e.target.checked)}
          />
          Abbreviate large numbers
        </label>
        <p className="text-xs text-(--prose-3)">
          When on, big EP and roll counts show as 4.8M-style shorthand. Hover or
          long-press the value for the exact figure. Default off.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.applyProfileAccentSiteWide === true}
            onChange={(e) => setApplyProfileAccentSiteWide(e.target.checked)}
          />
          Apply profile accent site-wide
        </label>
        <p className="text-xs text-(--prose-3)">
          When signed in, use your Account profile accent for global UI accents
          (links, highlights). Ranked amber and Features tag colors stay
          dedicated. Default off.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.shareShowUnlockedBadges !== false}
            onChange={(e) => setShareShowUnlockedBadges(e.target.checked)}
          />
          Include unlocked secret / lifetime / mastery seals on share cards
        </label>
        <p className="text-xs text-(--prose-3)">
          Public vanity links require an account and a confirmed cloud sync.
          Logged-out share is Discord text / PNG only. Discord embeds use
          dynamic OG art for rolls and public profiles. Seal names appear in
          Discord paste and PNG; profile OG can show a seal strip via ?seals=1
          (reuses existing collection data — no extra Neon read).
        </p>
      </section>

      <section className="space-y-2 text-sm text-(--prose-2)">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
          Roll &amp; codex tips
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-xs sm:text-sm">
          <li>
            Refreshing the site clears the home reel so you start a fresh spin;
            History and the Codex still keep everything you earned.
          </li>
          <li>
            Codex → <strong className="text-(--prose)">New</strong> lists
            first-time unlocks from the last 5 minutes (with unlock times on
            every badge).
          </li>
          <li>
            Community “today / week best” cards appear on Roll only when you are
            not mid-session on a roll.
          </li>
          <li>
            Badge auto-scroll is under Effects above — turn it off if you prefer
            to scroll the breakdown yourself.
          </li>
        </ul>
      </section>

      <section className="space-y-1 text-sm text-(--prose-2)">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
          Stats
        </h2>
        <p>
          Lifetime rolls: <FormattedCount value={lifetimeRollCount} />
        </p>
        <p>
          Lifetime EP: <FormattedCount value={lifetimeEP} />
        </p>
        <p>
          Journey EP: <FormattedCount value={journeyEP} />
        </p>
        <p>
          Day streak: {stats.dayStreak} (best {stats.bestDayStreak})
        </p>
        <p>
          Quality streak: {stats.qualityStreak} (best {stats.bestQualityStreak})
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
          Export / import
        </h2>
        <p className="text-xs text-(--prose-3)">
          Download a JSON save of history, collection, stats, and settings — or
          restore from a previous export.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-(--accent) bg-(--accent) px-3 py-2 text-xs font-bold uppercase text-(--bg)"
            onClick={exportSave}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="border border-(--accent) bg-(--accent) px-3 py-2 text-xs font-bold uppercase text-(--bg)"
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
        {importMsg && <p className="text-xs text-(--prose-2)">{importMsg}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-(--prose-3)">
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
              className="border border-(--outline) px-3 py-2 text-xs font-bold uppercase"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      <p className="text-xs text-(--prose-3)">RNGdle Unlocked v{APP_VERSION}</p>
    </div>
  );
}
