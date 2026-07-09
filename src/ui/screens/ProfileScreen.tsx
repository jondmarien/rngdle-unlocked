import { useEffect, useState } from 'react';
import {
  OMEGA_SECRET,
  topPercentFromPercentile,
  type RarityTier,
} from '../../game';
import { useSession } from '../../lib/auth-client';
import {
  accentStyles,
  normalizeAccent,
  type ProfileAccent,
} from '../../lib/profile-theme';
import { RarityBadge } from '../components/RarityBadge';
import { EPPill } from '../components/EPPill';

type Profile = {
  username: string;
  name: string;
  image: string | null;
  memberSince: string;
  profileAccent?: string;
  profileBio?: string;
  profileFlair?: string;
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  badgeCount: number;
  secrets?: {
    id: string;
    name: string;
    emoji: string;
    tier: 'section' | 'omega';
    section: string;
    ep: number;
    unlocked?: boolean;
  }[];
  stats: {
    bestRoll?: {
      number: number;
      totalEP: number;
      rarity: string;
      percentile?: number;
      badgeCount?: number;
      rolledAt?: string;
      topBadges?: string[];
    } | null;
    bestQualityStreak?: number;
    bestDayStreak?: number;
  };
  recentRolls: {
    id: string;
    shortCode?: string | null;
    number: number;
    totalEP: number;
    rarity: string;
    percentile?: number;
    badgeCount: number;
    topBadges?: string[];
    attested?: boolean;
    challengeKey?: string | null;
    rolledAt: string;
  }[];
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function asRarity(r: string): RarityTier {
  const ok: RarityTier[] = [
    'trash',
    'common',
    'uncommon',
    'rare',
    'epic',
    'anomaly',
    'mythic',
  ];
  return (ok.includes(r as RarityTier) ? r : 'common') as RarityTier;
}

export function ProfileScreen({
  username,
  onOpenRoll,
  onBack,
}: {
  username: string;
  onOpenRoll: (id: string, username?: string | null) => void;
  onBack?: () => void;
}) {
  const { data: session } = useSession();
  const myUsername =
    (session?.user as { username?: string | null } | undefined)?.username ??
    null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followMsg, setFollowMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (!session?.user) {
      setFollowing(false);
      return;
    }
    let cancelled = false;
    fetch('/api/follow', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return;
        const data = (await r.json()) as {
          following?: { username: string | null }[];
        };
        if (cancelled) return;
        const hit = (data.following ?? []).some(
          (f) =>
            f.username &&
            f.username.toLowerCase() === username.toLowerCase(),
        );
        setFollowing(hit);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user, username]);

  const isSelf =
    myUsername && myUsername.toLowerCase() === username.toLowerCase();

  const toggleFollow = async () => {
    if (!session?.user) {
      setFollowMsg('Sign in to follow players.');
      return;
    }
    setFollowBusy(true);
    setFollowMsg(null);
    try {
      if (following) {
        const r = await fetch(
          `/api/follow?username=${encodeURIComponent(username)}`,
          { method: 'DELETE', credentials: 'include' },
        );
        const data = (await r.json()) as { error?: string };
        if (!r.ok) throw new Error(data.error ?? 'Unfollow failed');
        setFollowing(false);
      } else {
        const r = await fetch('/api/follow', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        const data = (await r.json()) as { error?: string };
        if (!r.ok) throw new Error(data.error ?? 'Follow failed');
        setFollowing(true);
      }
    } catch (e) {
      setFollowMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--prose-2)]">Loading profile…</p>;
  }
  if (error || !profile) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700 dark:text-red-400">
          {error ?? 'Not found'}
        </p>
        {onBack && (
          <button type="button" className="text-sm underline" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    );
  }

  const accent = normalizeAccent(profile.profileAccent);
  const theme = accentStyles(accent);
  const initial = (profile.username?.[0] ?? '?').toUpperCase();
  const best = profile.stats?.bestRoll;
  // Only completed secret section seals (API already filters; keep unlocked-only here)
  const unlockedSecrets = (profile.secrets ?? []).filter(
    (s) => s.unlocked !== false,
  );
  const hasOmega = unlockedSecrets.some((s) => s.id === OMEGA_SECRET.id);
  const sectionSecrets = unlockedSecrets.filter((s) => s.tier === 'section');
  const unlockedCount = unlockedSecrets.length;

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--prose-2)] underline-offset-2 hover:underline"
          onClick={onBack}
        >
          ← Back
        </button>
      )}

      {/* Hero banner */}
      <section
        className={`relative overflow-hidden rounded-xl border border-[var(--outline)] bg-gradient-to-br ${theme.banner} p-5 sm:p-6`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[var(--outline)] bg-[var(--surface)] text-2xl font-bold ring-2 ${theme.ring}`}
              aria-hidden
            >
              {profile.image ? (
                <img
                  src={profile.image}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--prose-2)]">
                @{profile.username}
              </p>
              <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {profile.name}
              </h1>
              {profile.profileFlair && (
                <p
                  className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-sm font-medium ${theme.chip}`}
                >
                  {profile.profileFlair}
                </p>
              )}
              {profile.profileBio && (
                <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--prose)]">
                  {profile.profileBio}
                </p>
              )}
              <p className="mt-2 text-sm text-[var(--prose-2)]">
                Member since {fmtDate(String(profile.memberSince))}
              </p>
            </div>
          </div>
          {!isSelf && (
            <button
              type="button"
              disabled={followBusy}
              onClick={() => void toggleFollow()}
              className={`shrink-0 border-2 px-4 py-2 text-sm font-semibold ${
                following
                  ? 'border-[var(--outline)] bg-[var(--surface)] text-[var(--prose-2)]'
                  : 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
              }`}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        {followMsg && (
          <p className="mt-3 text-sm text-[var(--prose-2)]">{followMsg}</p>
        )}
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Lifetime EP" value={profile.lifetimeEP.toLocaleString()} soft={theme.soft} />
        <Stat
          label="Rolls"
          value={profile.lifetimeRollCount.toLocaleString()}
          soft={theme.soft}
        />
        <Stat label="Badges" value={String(profile.badgeCount)} soft={theme.soft} />
        <Stat
          label="Journey EP"
          value={profile.journeyEP.toLocaleString()}
          soft={theme.soft}
        />
      </div>

      {(profile.stats?.bestDayStreak || profile.stats?.bestQualityStreak) && (
        <div className="flex flex-wrap gap-2 text-sm text-[var(--prose-2)]">
          {profile.stats.bestDayStreak != null &&
            profile.stats.bestDayStreak > 0 && (
              <span className={`rounded-md border px-2.5 py-1 ${theme.soft}`}>
                Best day streak {profile.stats.bestDayStreak}
              </span>
            )}
          {profile.stats.bestQualityStreak != null &&
            profile.stats.bestQualityStreak > 0 && (
              <span className={`rounded-md border px-2.5 py-1 ${theme.soft}`}>
                Best quality streak {profile.stats.bestQualityStreak}
              </span>
            )}
        </div>
      )}

      {/* Secret masteries — only completed section seals (+ omega if earned) */}
      {unlockedCount > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--prose)]">
              Secret masteries
            </h2>
            <span className="text-sm text-[var(--prose-2)]">
              {unlockedCount} earned
            </span>
          </div>
          <p className="text-sm text-[var(--prose-2)]">
            Seals for completing whole codex sections.
          </p>

          {hasOmega && (
            <div className="rounded-xl border-2 border-amber-400/70 bg-gradient-to-br from-amber-500/20 via-violet-500/15 to-teal-500/20 p-4 shadow-[0_0_32px_rgba(251,191,36,0.2)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                Final seal
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {OMEGA_SECRET.emoji} {OMEGA_SECRET.name}
              </p>
              <p className="mt-1 text-sm text-[var(--prose-2)]">
                {OMEGA_SECRET.description}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                +{OMEGA_SECRET.ep.toLocaleString()} life EP
              </p>
            </div>
          )}

          {sectionSecrets.length > 0 && (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sectionSecrets.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-violet-400/50 bg-gradient-to-br from-violet-500/15 to-transparent p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    {s.section}
                  </p>
                  <p className="font-bold tracking-tight">
                    <span className="mr-1" aria-hidden>
                      {s.emoji}
                    </span>
                    {s.name}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    +{s.ep.toLocaleString()} life EP
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Best roll — showcase style */}
      {best && (
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[var(--prose)]">Best roll</h2>
          <div
            className={`rounded-xl border bg-[var(--surface)] p-4 ${theme.soft}`}
          >
            <div className="mono-number text-3xl font-bold sm:text-4xl">
              {best.number.toLocaleString()}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RarityBadge rarity={asRarity(best.rarity)} />
              <EPPill ep={best.totalEP} />
              {best.percentile != null && (
                <span className="text-sm text-[var(--prose-2)]">
                  Top {topPercentFromPercentile(best.percentile)}%
                </span>
              )}
            </div>
            {best.topBadges && best.topBadges.length > 0 && (
              <p className="mt-2 text-sm text-[var(--prose-2)]">
                {best.topBadges.join(' · ')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Recent rolls — history/showcase style cards */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-[var(--prose)]">
            Recent public rolls
          </h2>
          <span className="text-sm text-[var(--prose-2)]">
            {profile.recentRolls.length} shown
          </span>
        </div>
        {profile.recentRolls.length === 0 ? (
          <p className="text-sm text-[var(--prose-2)]">No public rolls yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {profile.recentRolls.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--prose-2)] hover:bg-[var(--surface-raised)]"
                  onClick={() =>
                    onOpenRoll(r.shortCode || r.id, profile.username)
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mono-number text-2xl font-bold tracking-tight">
                        {r.number.toLocaleString()}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RarityBadge rarity={asRarity(r.rarity)} />
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                          {r.totalEP.toLocaleString()} EP
                        </span>
                        {r.percentile != null && (
                          <span className="text-sm text-[var(--prose-2)]">
                            Top {topPercentFromPercentile(r.percentile)}%
                          </span>
                        )}
                        {r.attested && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${theme.chip}`}
                          >
                            Sealed
                          </span>
                        )}
                        {r.challengeKey && (
                          <span className="text-xs font-mono text-[var(--prose-2)]">
                            {r.challengeKey}
                          </span>
                        )}
                      </div>
                      {r.topBadges && r.topBadges.length > 0 && (
                        <p className="mt-2 text-sm leading-snug text-[var(--prose-2)]">
                          {r.topBadges.join(' · ')}
                          {r.badgeCount > (r.topBadges?.length ?? 0)
                            ? ` · +${r.badgeCount - r.topBadges.length} more`
                            : ''}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-sm text-[var(--prose-2)]">
                      {fmtDate(r.rolledAt)}
                    </time>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  soft,
}: {
  label: string;
  value: string;
  soft: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${soft}`}>
      <div className="text-sm font-semibold text-[var(--prose-2)]">{label}</div>
      <div className="mono-number text-xl font-bold">{value}</div>
    </div>
  );
}

// silence unused type export if needed
export type { ProfileAccent };
