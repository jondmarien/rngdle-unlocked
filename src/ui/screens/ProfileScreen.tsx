import { useEffect, useState } from 'react';

type Profile = {
  username: string;
  name: string;
  image: string | null;
  memberSince: string;
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  badgeCount: number;
  stats: {
    bestRoll?: { number: number; totalEP: number; rarity: string } | null;
    bestQualityStreak?: number;
    bestDayStreak?: number;
  };
  recentRolls: {
    id: string;
    number: number;
    totalEP: number;
    rarity: string;
    badgeCount: number;
    rolledAt: string;
  }[];
};

export function ProfileScreen({
  username,
  onOpenRoll,
  onBack,
}: {
  username: string;
  onOpenRoll: (id: string) => void;
  onBack?: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Not found');
        if (!cancelled) setProfile(data.profile);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return <p className="text-sm text-[var(--prose-3)]">Loading profile…</p>;
  }
  if (error || !profile) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error ?? 'Not found'}
        </p>
        {onBack && (
          <button type="button" className="text-xs underline" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <button type="button" className="text-xs uppercase underline" onClick={onBack}>
          ← Back
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold">@{profile.username}</h1>
        <p className="text-sm text-[var(--prose-3)]">{profile.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Lifetime EP" value={profile.lifetimeEP.toLocaleString()} />
        <Stat label="Rolls" value={profile.lifetimeRollCount.toLocaleString()} />
        <Stat label="Badges" value={String(profile.badgeCount)} />
        <Stat label="Journey EP" value={profile.journeyEP.toLocaleString()} />
      </div>

      {profile.stats?.bestRoll && (
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3 text-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--prose-3)]">
            Best roll
          </div>
          <div className="mono-number text-xl font-bold">
            {profile.stats.bestRoll.number.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--prose-3)]">
            {profile.stats.bestRoll.totalEP.toLocaleString()} EP ·{' '}
            {profile.stats.bestRoll.rarity}
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
          Recent public rolls
        </h2>
        {profile.recentRolls.length === 0 ? (
          <p className="text-sm text-[var(--prose-3)]">No public rolls yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
            {profile.recentRolls.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--surface-raised)]"
                  onClick={() => onOpenRoll(r.id)}
                >
                  <span className="mono-number font-bold">
                    {r.number.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--prose-3)]">
                    {r.totalEP.toLocaleString()} EP · {r.rarity} · {r.badgeCount}{' '}
                    badges
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--prose-3)]">
        {label}
      </div>
      <div className="mono-number text-lg font-bold">{value}</div>
    </div>
  );
}
