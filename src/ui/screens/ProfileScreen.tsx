import { useEffect, useMemo, useState } from 'react';
import {
  badgeRarityFromEP,
  JOURNEY_BADGES,
  NUMBER_BADGES,
  OMEGA_SECRET,
  topPercentFromPercentile,
  type BadgeFamily,
  type RarityTier,
} from '../../game';
import { useSession } from '../../lib/auth-client';
import { FAMILY_PILL } from '../../lib/badge-theme';
import { profileAvatarSrc } from '../../lib/profile-avatars';
import {
  accentStyles,
  normalizeAccent,
  type ProfileAccent,
} from '../../lib/profile-theme';
import { RarityBadge } from '../components/RarityBadge';
import { EPPill } from '../components/EPPill';

type CollectionEntryDto = {
  badgeId: string;
  family: string;
  firstEarnedAt: string;
};

type Profile = {
  username: string;
  name: string;
  image: string | null;
  memberSince: string;
  profileAccent?: string;
  profileBio?: string;
  profileFlair?: string;
  profileAvatar?: string;
  /** When false, owner hid public codex (default true). */
  profileShowCodex?: boolean;
  lifetimeEP: number;
  lifetimeRollCount: number;
  journeyEP: number;
  badgeCount: number;
  collection?: CollectionEntryDto[];
  secrets?: {
    id: string;
    name: string;
    emoji: string;
    image?: string;
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

const BADGE_CATALOG = (() => {
  const m = new Map<
    string,
    {
      id: string;
      name: string;
      emoji: string;
      family: BadgeFamily;
      ep: number;
      description: string;
    }
  >();
  for (const b of NUMBER_BADGES) {
    m.set(b.id, {
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      family: b.family,
      ep: b.ep,
      description: b.description,
    });
  }
  for (const b of JOURNEY_BADGES) {
    m.set(b.id, {
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      family: b.family,
      ep: b.ep,
      description: b.description,
    });
  }
  return m;
})();

const CODEX_FAMILY_FILTERS: { id: BadgeFamily | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'math', label: 'Math' },
  { id: 'pattern', label: 'Pattern' },
  { id: 'void', label: 'Void' },
  { id: 'cultural', label: 'Culture' },
  { id: 'magnitude', label: 'Size' },
  { id: 'sequence', label: 'Seq' },
  { id: 'poker', label: 'Poker' },
  { id: 'element', label: 'Element' },
  { id: 'journey', label: 'Journey' },
];

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

const PREVIEW_LIMIT = 10;

function SectionHeader({
  title,
  meta,
  open,
  onToggle,
}: {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-baseline justify-between gap-2 text-left"
      aria-expanded={open}
    >
      <h2 className="text-base font-bold text-[var(--prose)]">
        <span className="mr-1.5 inline-block w-4 text-center text-sm text-[var(--prose-3)]">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 text-sm text-[var(--prose-2)]">{meta}</span>
      )}
    </button>
  );
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
  const [codexFilter, setCodexFilter] = useState<BadgeFamily | 'all'>('all');
  const [openSecrets, setOpenSecrets] = useState(true);
  const [openCodex, setOpenCodex] = useState(true);
  const [openBest, setOpenBest] = useState(true);
  const [openRecent, setOpenRecent] = useState(true);
  const [codexExpanded, setCodexExpanded] = useState(false);
  const [recentExpanded, setRecentExpanded] = useState(false);
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

  /** Public codex: number + journey unlocks (secrets have their own section). */
  const codexUnlocks = useMemo(() => {
    const rows = profile?.collection ?? [];
    return rows
      .filter(
        (e) =>
          e.family !== 'secret' &&
          !e.badgeId.startsWith('secret-') &&
          BADGE_CATALOG.has(e.badgeId),
      )
      .map((e) => {
        const def = BADGE_CATALOG.get(e.badgeId)!;
        return {
          ...def,
          firstEarnedAt: e.firstEarnedAt,
          rarity: badgeRarityFromEP(def.ep),
        };
      })
      .sort((a, b) => {
        const ta = a.firstEarnedAt || '';
        const tb = b.firstEarnedAt || '';
        if (ta !== tb) return tb.localeCompare(ta);
        return a.name.localeCompare(b.name);
      });
  }, [profile?.collection]);

  const codexFiltered = useMemo(() => {
    if (codexFilter === 'all') return codexUnlocks;
    return codexUnlocks.filter((b) => b.family === codexFilter);
  }, [codexUnlocks, codexFilter]);

  const codexFamilyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of codexUnlocks) {
      m.set(b.family, (m.get(b.family) ?? 0) + 1);
    }
    return m;
  }, [codexUnlocks]);

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
  const avatarSrc =
    profileAvatarSrc(profile.profileAvatar) ?? profile.image ?? null;
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
              className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--outline)] bg-[var(--surface)] text-2xl font-bold ring-2 ${theme.ring}`}
              aria-hidden
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
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
          <SectionHeader
            title="Secret masteries"
            meta={`${unlockedCount} earned`}
            open={openSecrets}
            onToggle={() => setOpenSecrets((v) => !v)}
          />
          {openSecrets && (
            <>
              <p className="text-sm text-[var(--prose-2)]">
                Seals for completing whole codex sections.
              </p>

              {hasOmega && (
                <div className="flex flex-col gap-3 rounded-xl border-2 border-amber-400/70 bg-gradient-to-br from-amber-500/20 via-violet-500/15 to-teal-500/20 p-4 shadow-[0_0_32px_rgba(251,191,36,0.2)] sm:flex-row sm:items-center">
                  <img
                    src={OMEGA_SECRET.image}
                    alt={OMEGA_SECRET.name}
                    className="mx-auto h-28 w-28 rounded-xl border-2 border-amber-400/80 object-cover shadow-[0_0_20px_rgba(251,191,36,0.35)] sm:mx-0 sm:h-32 sm:w-32"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                      Final seal
                    </p>
                    <p className="mt-1 text-xl font-bold tracking-tight">
                      {OMEGA_SECRET.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--prose-2)]">
                      {OMEGA_SECRET.description}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                      +{OMEGA_SECRET.ep.toLocaleString()} life EP
                    </p>
                  </div>
                </div>
              )}

              {sectionSecrets.length > 0 && (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sectionSecrets.map((s) => (
                    <li
                      key={s.id}
                      className="flex gap-3 rounded-xl border border-violet-400/50 bg-gradient-to-br from-violet-500/15 to-transparent p-3"
                    >
                      {s.image && (
                        <img
                          src={s.image}
                          alt={s.name}
                          className="h-20 w-20 shrink-0 rounded-lg border border-violet-400/50 object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          {s.section}
                        </p>
                        <p className="font-bold tracking-tight">{s.name}</p>
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          +{s.ep.toLocaleString()} life EP
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* Codex unlocks — only if owner allows (default on) */}
      {profile.profileShowCodex !== false && (
        <section className="space-y-3">
          <SectionHeader
            title="Codex unlocks"
            meta={`${codexUnlocks.length} badge${codexUnlocks.length === 1 ? '' : 's'} · ${codexUnlocks.length}/${NUMBER_BADGES.length + JOURNEY_BADGES.length}`}
            open={openCodex}
            onToggle={() => setOpenCodex((v) => !v)}
          />
          {openCodex && (
            <>
              <p className="text-sm text-[var(--prose-2)]">
                Badges @{profile.username} has unlocked. Locked codex entries
                stay private.
              </p>

              {codexUnlocks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--outline)] px-3 py-4 text-sm text-[var(--prose-3)]">
                  No codex badges synced yet.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {CODEX_FAMILY_FILTERS.filter(
                      (f) =>
                        f.id === 'all' ||
                        (codexFamilyCounts.get(f.id) ?? 0) > 0,
                    ).map((f) => {
                      const selected = codexFilter === f.id;
                      const n =
                        f.id === 'all'
                          ? codexUnlocks.length
                          : (codexFamilyCounts.get(f.id) ?? 0);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setCodexFilter(f.id);
                            setCodexExpanded(false);
                          }}
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold sm:text-sm ${
                            selected
                              ? 'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]'
                              : 'border-[var(--outline)] text-[var(--prose-2)] hover:bg-[var(--surface-raised)]'
                          }`}
                        >
                          {f.label}
                          <span className="ml-1 opacity-70">{n}</span>
                        </button>
                      );
                    })}
                  </div>

                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(codexExpanded
                      ? codexFiltered
                      : codexFiltered.slice(0, PREVIEW_LIMIT)
                    ).map((b) => {
                      const fam =
                        b.family in FAMILY_PILL
                          ? FAMILY_PILL[b.family as BadgeFamily]
                          : null;
                      let when: string | null = null;
                      try {
                        if (b.firstEarnedAt) {
                          when = new Date(b.firstEarnedAt).toLocaleString(
                            undefined,
                            {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            },
                          );
                        }
                      } catch {
                        when = null;
                      }
                      return (
                        <li
                          key={b.id}
                          className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-3 text-left text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 font-bold tracking-tight">
                              <span className="mr-1" aria-hidden>
                                {b.emoji}
                              </span>
                              {b.name}
                            </div>
                            <span className="mono-number shrink-0 text-xs font-bold text-amber-700 dark:text-amber-400">
                              +{b.ep.toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--prose-2)]">
                            {b.description}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <RarityBadge rarity={b.rarity} />
                            {fam && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${fam.chip}`}
                              >
                                {fam.label}
                              </span>
                            )}
                            {when && (
                              <time
                                dateTime={b.firstEarnedAt}
                                className="text-[10px] text-[var(--prose-3)]"
                                title="First unlocked"
                              >
                                {when}
                              </time>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {codexFiltered.length === 0 && (
                    <p className="text-sm text-[var(--prose-3)]">
                      Nothing in this family yet.
                    </p>
                  )}
                  {codexFiltered.length > PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setCodexExpanded((v) => !v)}
                      className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--prose-2)] hover:border-[var(--prose-2)] hover:text-[var(--prose)]"
                    >
                      {codexExpanded
                        ? 'Show fewer'
                        : `+ ${codexFiltered.length - PREVIEW_LIMIT} more`}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* Best roll — showcase style */}
      {best && (
        <section className="space-y-2">
          <SectionHeader
            title="Best roll"
            open={openBest}
            onToggle={() => setOpenBest((v) => !v)}
          />
          {openBest && (
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
          )}
        </section>
      )}

      {/* Recent rolls — history/showcase style cards */}
      <section className="space-y-3">
        <SectionHeader
          title="Recent public rolls"
          meta={`${profile.recentRolls.length} total`}
          open={openRecent}
          onToggle={() => setOpenRecent((v) => !v)}
        />
        {openRecent && (
          <>
            {profile.recentRolls.length === 0 ? (
              <p className="text-sm text-[var(--prose-2)]">
                No public rolls yet.
              </p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {(recentExpanded
                    ? profile.recentRolls
                    : profile.recentRolls.slice(0, PREVIEW_LIMIT)
                  ).map((r) => (
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
                {profile.recentRolls.length > PREVIEW_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setRecentExpanded((v) => !v)}
                    className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-semibold text-[var(--prose-2)] hover:border-[var(--prose-2)] hover:text-[var(--prose)]"
                  >
                    {recentExpanded
                      ? 'Show fewer'
                      : `+ ${profile.recentRolls.length - PREVIEW_LIMIT} more`}
                  </button>
                )}
              </>
            )}
          </>
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
