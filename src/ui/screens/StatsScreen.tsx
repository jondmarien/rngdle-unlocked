import { useMemo } from 'react';
import type { RarityTier } from '../../game';
import { RARITY_LABELS, RARITY_ORDER, localDateKey } from '../../game';
import { RARITY_BAR } from '../../lib/badge-theme';
import { useGame } from '../../state/GameProvider';
import { StatTile } from '../components/StatTile';

/** Feature 8 — rarity histogram, EP/hour, streak calendar. */
export function StatsScreen() {
  const { history, lifetimeEP, lifetimeRollCount, stats, journeyEP } =
    useGame();

  const hist = useMemo(() => {
    const counts: Record<RarityTier, number> = {
      trash: 0,
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      anomaly: 0,
      mythic: 0,
    };
    for (const r of history) {
      counts[r.rarity] = (counts[r.rarity] ?? 0) + 1;
    }
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max };
  }, [history]);

  const epPerHour = useMemo(() => {
    if (history.length < 2) return null;
    const times = history.map((r) => new Date(r.rolledAt).getTime()).sort();
    const oldest = times[0]!;
    const newest = times[times.length - 1]!;
    const hours = Math.max((newest - oldest) / 3_600_000, 1 / 60);
    const epInWindow = history.reduce((s, r) => s + r.totalEP, 0);
    return epInWindow / hours;
  }, [history]);

  const calendar = useMemo(() => {
    const days: { key: string; rolls: number; ep: number }[] = [];
    const byDay = new Map<string, { rolls: number; ep: number }>();
    for (const r of history) {
      const key = localDateKey(new Date(r.rolledAt));
      const cur = byDay.get(key) ?? { rolls: 0, ep: 0 };
      cur.rolls += 1;
      cur.ep += r.totalEP;
      byDay.set(key, cur);
    }
    // Last 28 local days
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      const v = byDay.get(key) ?? { rolls: 0, ep: 0 };
      days.push({ key, ...v });
    }
    const maxRolls = Math.max(1, ...days.map((d) => d.rolls));
    return { days, maxRolls };
  }, [history]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">Stats</h1>
        <p className="text-xs text-[var(--prose-3)]">
          From local history (last {history.length} rolls) · lifetime counters
          never shrink.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Lifetime EP" value={lifetimeEP.toLocaleString()} />
        <StatTile
          label="Lifetime rolls"
          value={lifetimeRollCount.toLocaleString()}
        />
        <StatTile label="Journey EP" value={journeyEP.toLocaleString()} />
        <StatTile
          label="EP / hour"
          value={
            epPerHour == null
              ? '—'
              : epPerHour >= 1000
                ? `${Math.round(epPerHour).toLocaleString()}`
                : epPerHour.toFixed(1)
          }
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">
          Streaks
        </h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>
            🔥 Day streak <strong>{stats.dayStreak}</strong>
            <span className="text-[var(--prose-3)]">
              {' '}
              (best {stats.bestDayStreak})
            </span>
          </span>
          <span>
            ⚡ Quality <strong>{stats.qualityStreak}</strong>
            <span className="text-[var(--prose-3)]">
              {' '}
              (best {stats.bestQualityStreak})
            </span>
          </span>
        </div>
        {stats.bestRoll && (
          <p className="mt-2 text-xs text-[var(--prose-3)]">
            Best roll: {stats.bestRoll.number.toLocaleString()} ·{' '}
            {stats.bestRoll.totalEP.toLocaleString()} EP ·{' '}
            {stats.bestRoll.rarity}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">
          Rarity histogram
        </h2>
        <p className="mb-3 text-xs text-[var(--prose-3)]">
          Counts in current history window (not lifetime if history rotated).
        </p>
        <ul className="space-y-2">
          {RARITY_ORDER.map((tier) => {
            const n = hist.counts[tier];
            const pct = (n / hist.max) * 100;
            return (
              <li key={tier} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 font-semibold text-[var(--prose-2)]">
                  {RARITY_LABELS[tier] ?? tier}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-[var(--surface-raised)]">
                  <div
                    className={`h-full ${RARITY_BAR[tier]} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="mono-number w-8 text-right">{n}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">
          Streak calendar
        </h2>
        <p className="mb-3 text-xs text-[var(--prose-3)]">
          Last 28 local days — intensity by roll count in history.
        </p>
        <div className="grid grid-cols-7 gap-1">
          {calendar.days.map((d) => {
            const intensity =
              d.rolls === 0 ? 0 : 0.25 + (d.rolls / calendar.maxRolls) * 0.75;
            return (
              <div
                key={d.key}
                title={`${d.key}: ${d.rolls} rolls · ${d.ep.toLocaleString()} EP`}
                className="aspect-square rounded border border-[var(--outline)]"
                style={{
                  backgroundColor:
                    d.rolls === 0
                      ? 'transparent'
                      : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`,
                }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-sm text-[var(--prose-2)]">
          <span>{calendar.days[0]?.key}</span>
          <span>{calendar.days[calendar.days.length - 1]?.key}</span>
        </div>
      </section>
    </div>
  );
}
