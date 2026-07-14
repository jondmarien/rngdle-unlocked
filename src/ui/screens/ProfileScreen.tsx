import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  badgeRarityFromEP,
  coerceRarity,
  JOURNEY_BADGES,
  LIFETIME_EP_BADGES,
  lifetimeEpBadgesForEp,
  NUMBER_BADGES,
  OMEGA_SECRET,
  secretById,
  STREAK_SECRETS,
  topPercentFromEP,
  type BadgeFamily,
} from '../../game';
import { fileReport } from '../../lib/admin-api';
import { useSession } from '../../lib/auth-client';
import { FAMILY_PILL } from '../../lib/badge-theme';
import { formatDateTime } from '../../lib/format';
import { QueryErrorBanner } from '../components/QueryErrorBanner';
import { RelativeTime } from '../components/RollRow';
import {
  FOLLOWING_USERNAMES_QUERY_KEY,
  fetchFollowingUsernames,
  followUser,
  unfollowUser,
} from '../../lib/notifications-api';
import { fetchProfile } from '../../lib/profile-api';
import { profileAvatarSrc } from '../../lib/profile-avatars';
import { accentStyles, normalizeAccent } from '../../lib/profile-theme';
import { EPPill } from '../components/EPPill';
import {
  BadgeArtLightbox,
  type BadgeArtLightboxItem,
} from '../components/BadgeArtLightbox';
import { FormattedCount } from '../components/FormattedCount';
import { RarityBadge } from '../components/RarityBadge';
import { SectionHeader } from '../components/SectionHeader';
import { StatTile } from '../components/StatTile';

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
      image?: string;
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
      ...(b.image ? { image: b.image } : {}),
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
      ...(b.image ? { image: b.image } : {}),
    });
  }
  for (const b of LIFETIME_EP_BADGES) {
    m.set(b.id, {
      id: b.id,
      name: b.name,
      emoji: b.emoji,
      family: b.family,
      ep: b.ep,
      description: b.description,
      ...(b.image ? { image: b.image } : {}),
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
  { id: 'bases', label: 'Bases' },
  { id: 'years', label: 'Years' },
];

const PREVIEW_LIMIT = 10;

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
  const queryClient = useQueryClient();
  const myUsername = session?.user.username ?? null;
  const [codexFilter, setCodexFilter] = useState<BadgeFamily | 'all'>('all');
  const [openJourney, setOpenJourney] = useState(true);
  const [showAllJourney, setShowAllJourney] = useState(false);
  const [openLifetimeEp, setOpenLifetimeEp] = useState(true);
  const [showAllLifetimeEp, setShowAllLifetimeEp] = useState(false);
  const [openSecrets, setOpenSecrets] = useState(true);
  const [openStreakSecrets, setOpenStreakSecrets] = useState(true);
  const [openCodex, setOpenCodex] = useState(false);
  const [openBest, setOpenBest] = useState(true);
  const [openRecent, setOpenRecent] = useState(true);
  const [codexExpanded, setCodexExpanded] = useState(false);
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followMsg, setFollowMsg] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<BadgeArtLightboxItem | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile', username.toLowerCase()],
    queryFn: () => fetchProfile(username),
  });
  const profile = profileQuery.data ?? null;
  const loading = profileQuery.isPending;
  const error = profileQuery.error
    ? profileQuery.error instanceof Error
      ? profileQuery.error.message
      : 'Failed'
    : null;

  const isSelf = Boolean(
    myUsername && myUsername.toLowerCase() === username.toLowerCase(),
  );

  const myProfileQuery = useQuery({
    queryKey: ['profile', myUsername?.toLowerCase() ?? ''],
    queryFn: () => fetchProfile(myUsername!),
    enabled: Boolean(myUsername) && !isSelf,
  });
  const myProfile = myProfileQuery.data ?? null;

  const followingQuery = useQuery({
    queryKey: FOLLOWING_USERNAMES_QUERY_KEY,
    queryFn: fetchFollowingUsernames,
    enabled: Boolean(session?.user),
    staleTime: 60_000,
  });
  const following = Boolean(followingQuery.data?.has(username.toLowerCase()));

  /** Public codex: number unlocks (journey + lifetime EP + secrets have their own sections). */
  const codexUnlocks = useMemo(() => {
    const rows = profile?.collection ?? [];
    return rows
      .filter(
        (e) =>
          e.family !== 'secret' &&
          e.family !== 'journey' &&
          e.family !== 'lifetime' &&
          !e.badgeId.startsWith('secret-') &&
          !e.badgeId.startsWith('rolls-') &&
          !e.badgeId.startsWith('ep-') &&
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

  /** Unlocked journey milestones only (dedicated art section). Catalog order = ascending. */
  const unlockedJourney = useMemo(() => {
    const rows = profile?.collection ?? [];
    const ids = new Set(
      rows
        .filter((e) => e.family === 'journey' || e.badgeId.startsWith('rolls-'))
        .map((e) => e.badgeId),
    );
    return JOURNEY_BADGES.filter((b) => ids.has(b.id));
  }, [profile?.collection]);

  /** Highest unlocked journey badge (last in ascending catalog order). */
  const latestJourney = unlockedJourney[unlockedJourney.length - 1] ?? null;
  const visibleJourney =
    showAllJourney || unlockedJourney.length <= 1
      ? unlockedJourney
      : latestJourney
        ? [latestJourney]
        : [];

  /**
   * Lifetime EP milestones for Profile: prefer collection ids, but also include
   * tiers implied by public lifetimeEP so seals show even before cloud backfill sync.
   */
  const unlockedLifetimeEp = useMemo(() => {
    const rows = profile?.collection ?? [];
    const fromCollection = new Set(
      rows
        .filter((e) => e.family === 'lifetime' || e.badgeId.startsWith('ep-'))
        .map((e) => e.badgeId),
    );
    for (const b of lifetimeEpBadgesForEp(profile?.lifetimeEP ?? 0)) {
      fromCollection.add(b.id);
    }
    return LIFETIME_EP_BADGES.filter((b) => fromCollection.has(b.id));
  }, [profile?.collection, profile?.lifetimeEP]);

  /** Highest unlocked lifetime EP badge (last in ascending catalog order). */
  const latestLifetimeEp =
    unlockedLifetimeEp[unlockedLifetimeEp.length - 1] ?? null;
  const visibleLifetimeEp =
    showAllLifetimeEp || unlockedLifetimeEp.length <= 1
      ? unlockedLifetimeEp
      : latestLifetimeEp
        ? [latestLifetimeEp]
        : [];

  /** Streak / giant secret badges from synced collection (not section masteries). */
  const unlockedStreakSecrets = useMemo(() => {
    const rows = profile?.collection ?? [];
    const ids = new Set(
      rows
        .filter(
          (e) =>
            e.family === 'secret' ||
            e.badgeId.startsWith('secret-streak-') ||
            e.badgeId === 'secret-giant-numbers',
        )
        .map((e) => e.badgeId),
    );
    return STREAK_SECRETS.filter((s) => ids.has(s.id));
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
    const key = username.toLowerCase();
    const prev =
      queryClient.getQueryData<Set<string>>(FOLLOWING_USERNAMES_QUERY_KEY) ??
      new Set<string>();
    try {
      if (following) {
        await unfollowUser(username);
        const next = new Set(prev);
        next.delete(key);
        queryClient.setQueryData(FOLLOWING_USERNAMES_QUERY_KEY, next);
      } else {
        await followUser(username);
        const next = new Set(prev);
        next.add(key);
        queryClient.setQueryData(FOLLOWING_USERNAMES_QUERY_KEY, next);
      }
    } catch (e) {
      setFollowMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-(--prose-2)">Loading profile…</p>;
  }
  if (error || !profile) {
    return (
      <div className="space-y-2">
        <QueryErrorBanner
          message={error ?? 'Not found'}
          onRetry={() => void profileQuery.refetch()}
        />
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
          className="text-sm font-semibold text-(--prose-2) underline-offset-2 hover:underline"
          onClick={onBack}
        >
          ← Back
        </button>
      )}

      {/* Hero banner */}
      <section
        className={`relative overflow-hidden rounded-xl border border-(--outline) bg-linear-to-br ${theme.banner} p-5 sm:p-6`}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-(--outline) bg-(--surface) text-2xl font-bold ring-2 ${theme.ring}`}
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
              <p className="text-sm font-semibold text-(--prose-2)">
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
              {(profile.progressProvenance === 'cloud_sync' ||
                profile.progressProvenance === 'cloned_local' ||
                profile.progressProvenance === 'local_progress') && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      profile.progressProvenance === 'cloned_local'
                        ? 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        : profile.progressProvenance === 'cloud_sync'
                          ? 'border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-200'
                          : 'border-(--outline) bg-(--surface) text-(--prose-2)'
                    }`}
                    title={
                      profile.progressProvenance === 'cloned_local'
                        ? 'Best roll id points at another account’s roll — likely copied localStorage progress'
                        : profile.progressProvenance === 'cloud_sync'
                          ? 'Best roll is owned by this account in the cloud'
                          : 'Progress present without a cloud-owned best roll'
                    }
                  >
                    {profile.progressProvenanceLabel ??
                      (profile.progressProvenance === 'cloned_local'
                        ? 'Cloned local progress'
                        : profile.progressProvenance === 'cloud_sync'
                          ? 'Cloud sync'
                          : 'Local progress')}
                  </span>
                </p>
              )}
              {profile.profileBio && (
                <p className="mt-2 max-w-md text-sm leading-relaxed text-(--prose)">
                  {profile.profileBio}
                </p>
              )}
              <p className="mt-2 text-sm text-(--prose-2)">
                Member since {formatDateTime(String(profile.memberSince))}
              </p>
            </div>
          </div>
          {!isSelf && (
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                disabled={followBusy}
                onClick={() => void toggleFollow()}
                className={`border-2 px-4 py-2 text-sm font-semibold ${
                  following
                    ? 'border-(--outline) bg-(--surface) text-(--prose-2)'
                    : 'border-(--prose) bg-(--prose) text-(--bg)'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
              {session?.user && (
                <button
                  type="button"
                  className="text-xs font-semibold text-(--prose-3) underline"
                  onClick={() => {
                    const reason = window.prompt(
                      'Why are you reporting this username / profile? (min 8 chars)',
                    );
                    if (!reason || reason.trim().length < 8) return;
                    void fileReport({
                      targetUsername: profile.username,
                      reason: reason.trim(),
                    }).then((res) => {
                      setFollowMsg(
                        res.ok
                          ? 'Report submitted. Thanks — admins will review.'
                          : res.error,
                      );
                    });
                  }}
                >
                  Report username
                </button>
              )}
            </div>
          )}
        </div>
        {followMsg && (
          <p className="mt-3 text-sm text-(--prose-2)">{followMsg}</p>
        )}
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Lifetime EP"
          value={<FormattedCount value={profile.lifetimeEP} />}
          className={theme.soft}
        />
        <StatTile
          label="Rolls"
          value={<FormattedCount value={profile.lifetimeRollCount} />}
          className={theme.soft}
        />
        <StatTile
          label="Badges"
          value={String(profile.badgeCount)}
          className={theme.soft}
        />
        <StatTile
          label="Journey EP"
          value={<FormattedCount value={profile.journeyEP} />}
          className={theme.soft}
        />
      </div>

      {!isSelf && myUsername && myProfile && (
        <section className="rounded-lg border border-(--outline) bg-(--surface) p-3">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-(--prose-3)">
            Compare with me
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[16rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-(--prose-3)">
                  <th className="pb-1.5 pr-2 font-semibold" />
                  <th className="pb-1.5 pr-2 font-semibold">
                    @{profile.username}
                  </th>
                  <th className="pb-1.5 font-semibold">@{myUsername}</th>
                </tr>
              </thead>
              <tbody className="text-(--prose)">
                <tr className="border-t border-(--outline)">
                  <td className="py-1.5 pr-2 text-(--prose-2)">Lifetime EP</td>
                  <td className="mono-number py-1.5 pr-2 font-semibold">
                    <FormattedCount value={profile.lifetimeEP} />
                  </td>
                  <td className="mono-number py-1.5 font-semibold">
                    <FormattedCount value={myProfile.lifetimeEP} />
                  </td>
                </tr>
                <tr className="border-t border-(--outline)">
                  <td className="py-1.5 pr-2 text-(--prose-2)">Rolls</td>
                  <td className="mono-number py-1.5 pr-2 font-semibold">
                    <FormattedCount value={profile.lifetimeRollCount} />
                  </td>
                  <td className="mono-number py-1.5 font-semibold">
                    <FormattedCount value={myProfile.lifetimeRollCount} />
                  </td>
                </tr>
                <tr className="border-t border-(--outline)">
                  <td className="py-1.5 pr-2 text-(--prose-2)">Best roll</td>
                  <td className="py-1.5 pr-2">
                    {best ? (
                      <span className="mono-number font-semibold">
                        {best.number.toLocaleString()}
                        <span className="ml-1 text-[11px] font-normal text-(--prose-3)">
                          (<FormattedCount value={best.totalEP} /> EP)
                        </span>
                      </span>
                    ) : (
                      <span className="text-(--prose-3)">—</span>
                    )}
                  </td>
                  <td className="py-1.5">
                    {myProfile.stats?.bestRoll ? (
                      <span className="mono-number font-semibold">
                        {myProfile.stats.bestRoll.number.toLocaleString()}
                        <span className="ml-1 text-[11px] font-normal text-(--prose-3)">
                          (
                          <FormattedCount
                            value={myProfile.stats.bestRoll.totalEP}
                          />{' '}
                          EP)
                        </span>
                      </span>
                    ) : (
                      <span className="text-(--prose-3)">—</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(profile.stats?.bestDayStreak || profile.stats?.bestQualityStreak) && (
        <div className="flex flex-wrap gap-2 text-sm text-(--prose-2)">
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

      {/* Best roll — showcase style (above lifetime EP + journey + secrets) */}
      {best && (
        <section className="space-y-2">
          <SectionHeader
            title="Best roll"
            open={openBest}
            onToggle={() => setOpenBest((v) => !v)}
          />
          {openBest && (
            <div
              className={`rounded-xl border bg-(--surface) p-4 ${theme.soft}`}
            >
              <div className="mono-number text-3xl font-bold sm:text-4xl">
                {best.number.toLocaleString()}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RarityBadge rarity={coerceRarity(best.rarity)} />
                <EPPill ep={best.totalEP} />
                <span className="text-sm text-(--prose-2)">
                  Top {topPercentFromEP(best.totalEP)}%
                </span>
              </div>
              {best.topBadges && best.topBadges.length > 0 && (
                <p className="mt-2 text-sm text-(--prose-2)">
                  {best.topBadges.join(' · ')}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Lifetime EP badges — directly under Best roll; latest by default */}
      {unlockedLifetimeEp.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Lifetime EP badges"
            meta={
              unlockedLifetimeEp.length === 1
                ? '1 earned'
                : showAllLifetimeEp
                  ? `${unlockedLifetimeEp.length} earned`
                  : `Latest of ${unlockedLifetimeEp.length}`
            }
            open={openLifetimeEp}
            onToggle={() => setOpenLifetimeEp((v) => !v)}
          />
          {openLifetimeEp && (
            <>
              <p className="text-sm text-(--prose-2)">
                {showAllLifetimeEp || unlockedLifetimeEp.length === 1
                  ? `Lifetime EP milestones @${profile.username} has reached.`
                  : `Highest lifetime EP milestone @${profile.username} has reached.`}
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleLifetimeEp.map((b) => (
                  <li
                    key={b.id}
                    className="flex gap-3 rounded-xl border border-amber-400/45 bg-linear-to-br from-amber-500/15 via-teal-500/10 to-transparent p-3"
                  >
                    {b.image ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                        onClick={() =>
                          setLightbox({
                            image: b.image!,
                            name: b.name,
                            description: b.description,
                            ep: b.ep,
                            kind: 'Lifetime EP',
                          })
                        }
                        aria-label={`View ${b.name} full size`}
                      >
                        <img
                          src={b.image}
                          alt=""
                          className="h-20 w-20 rounded-lg border border-amber-400/50 object-cover"
                        />
                      </button>
                    ) : (
                      <span
                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-(--outline) bg-(--surface) text-3xl"
                        aria-hidden
                      >
                        {b.emoji}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Lifetime EP
                        {!showAllLifetimeEp && unlockedLifetimeEp.length > 1
                          ? ' · latest'
                          : ''}
                      </p>
                      <p className="font-bold tracking-tight">{b.name}</p>
                      <p className="mt-0.5 text-sm text-(--prose-2)">
                        {b.description}
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        +{b.ep.toLocaleString()} life EP
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {unlockedLifetimeEp.length > 1 && (
                <button
                  type="button"
                  className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
                  onClick={() => setShowAllLifetimeEp((v) => !v)}
                >
                  {showAllLifetimeEp
                    ? 'Show latest only'
                    : `Show all ${unlockedLifetimeEp.length} lifetime EP badges`}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* Journey badges — latest by default; expand to show all earned */}
      {unlockedJourney.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Journey badges"
            meta={
              unlockedJourney.length === 1
                ? '1 earned'
                : showAllJourney
                  ? `${unlockedJourney.length} earned`
                  : `Latest of ${unlockedJourney.length}`
            }
            open={openJourney}
            onToggle={() => setOpenJourney((v) => !v)}
          />
          {openJourney && (
            <>
              <p className="text-sm text-(--prose-2)">
                {showAllJourney || unlockedJourney.length === 1
                  ? `Lifetime roll milestones @${profile.username} has reached.`
                  : `Highest journey milestone @${profile.username} has reached.`}
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleJourney.map((b) => (
                  <li
                    key={b.id}
                    className="flex gap-3 rounded-xl border border-amber-400/45 bg-linear-to-br from-amber-500/15 via-teal-500/10 to-transparent p-3"
                  >
                    {b.image ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                        onClick={() =>
                          setLightbox({
                            image: b.image!,
                            name: b.name,
                            description: b.description,
                            ep: b.ep,
                            kind: 'Journey',
                          })
                        }
                        aria-label={`View ${b.name} full size`}
                      >
                        <img
                          src={b.image}
                          alt=""
                          className="h-20 w-20 rounded-lg border border-amber-400/50 object-cover"
                        />
                      </button>
                    ) : (
                      <span
                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-(--outline) bg-(--surface) text-3xl"
                        aria-hidden
                      >
                        {b.emoji}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Journey
                        {!showAllJourney && unlockedJourney.length > 1
                          ? ' · latest'
                          : ''}
                      </p>
                      <p className="font-bold tracking-tight">{b.name}</p>
                      <p className="mt-0.5 text-sm text-(--prose-2)">
                        {b.description}
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        +{b.ep.toLocaleString()} life EP
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {unlockedJourney.length > 1 && (
                <button
                  type="button"
                  className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
                  onClick={() => setShowAllJourney((v) => !v)}
                >
                  {showAllJourney
                    ? 'Show latest only'
                    : `Show all ${unlockedJourney.length} journey badges`}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* Secret badges — streak / giant meta unlocks */}
      {unlockedStreakSecrets.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            title="Secret badges"
            meta={`${unlockedStreakSecrets.length} earned`}
            open={openStreakSecrets}
            onToggle={() => setOpenStreakSecrets((v) => !v)}
          />
          {openStreakSecrets && (
            <>
              <p className="text-sm text-(--prose-2)">
                Streak and window secrets @{profile.username} has unlocked.
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {unlockedStreakSecrets.map((s) => (
                  <li
                    key={s.id}
                    className="flex gap-3 rounded-xl border border-fuchsia-400/45 bg-linear-to-br from-fuchsia-500/15 via-violet-500/10 to-transparent p-3"
                  >
                    <button
                      type="button"
                      className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
                      onClick={() =>
                        setLightbox({
                          image: s.image,
                          name: s.name,
                          description: s.description,
                          ep: s.ep,
                          kind: 'Streak secret',
                        })
                      }
                      aria-label={`View ${s.name} full size`}
                    >
                      <img
                        src={s.image}
                        alt=""
                        className="h-20 w-20 rounded-lg border border-fuchsia-400/50 object-cover"
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-800 dark:text-fuchsia-300">
                        Streak secret
                      </p>
                      <p className="font-bold tracking-tight">{s.name}</p>
                      <p className="mt-0.5 text-sm text-(--prose-2)">
                        {s.description}
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        +{s.ep.toLocaleString()} life EP
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
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
              <p className="text-sm text-(--prose-2)">
                Seals for completing whole codex sections.
              </p>

              {hasOmega && (
                <div className="flex flex-col gap-3 rounded-xl border-2 border-amber-400/70 bg-linear-to-br from-amber-500/20 via-violet-500/15 to-teal-500/20 p-4 shadow-[0_0_32px_rgba(251,191,36,0.2)] sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className="mx-auto shrink-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:mx-0"
                    onClick={() =>
                      setLightbox({
                        image: OMEGA_SECRET.image,
                        name: OMEGA_SECRET.name,
                        description: OMEGA_SECRET.description,
                        ep: OMEGA_SECRET.ep,
                        kind: 'Final seal',
                      })
                    }
                    aria-label={`View ${OMEGA_SECRET.name} full size`}
                  >
                    <img
                      src={OMEGA_SECRET.image}
                      alt=""
                      className="h-28 w-28 rounded-xl border-2 border-amber-400/80 object-cover shadow-[0_0_20px_rgba(251,191,36,0.35)] sm:h-32 sm:w-32"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                      Final seal
                    </p>
                    <p className="mt-1 text-xl font-bold tracking-tight">
                      {OMEGA_SECRET.name}
                    </p>
                    <p className="mt-1 text-sm text-(--prose-2)">
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
                      className="flex gap-3 rounded-xl border border-violet-400/50 bg-linear-to-br from-violet-500/15 to-transparent p-3"
                    >
                      {s.image && (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                          onClick={() =>
                            setLightbox({
                              image: s.image!,
                              name: s.name,
                              ep: s.ep,
                              kind: s.section,
                            })
                          }
                          aria-label={`View ${s.name} full size`}
                        >
                          <img
                            src={s.image}
                            alt=""
                            className="h-20 w-20 rounded-lg border border-violet-400/50 object-cover"
                          />
                        </button>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                          {s.section}
                        </p>
                        <p className="font-bold tracking-tight">{s.name}</p>
                        <p className="mt-0.5 text-sm text-(--prose-2)">
                          {secretById(s.id)?.description ??
                            `Section mastery · ${s.section}`}
                        </p>
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

      {/* Codex unlocks — collapsed by default; owner can hide entirely */}
      {profile.profileShowCodex !== false && (
        <section className="space-y-3">
          <SectionHeader
            title="Codex unlocks"
            meta={`${codexUnlocks.length} badge${codexUnlocks.length === 1 ? '' : 's'} · ${codexUnlocks.length}/${NUMBER_BADGES.length}`}
            open={openCodex}
            onToggle={() => setOpenCodex((v) => !v)}
          />
          {openCodex && (
            <>
              <p className="text-sm text-(--prose-2)">
                Badges @{profile.username} has unlocked. Locked codex entries
                stay private.
              </p>

              {codexUnlocks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-(--outline) px-3 py-4 text-sm text-(--prose-3)">
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
                              ? 'border-(--prose) bg-(--prose) text-(--bg)'
                              : 'border-(--outline) text-(--prose-2) hover:bg-(--surface-raised)'
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
                          className="rounded-lg border border-(--outline) bg-(--surface) p-3 text-left text-sm"
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
                          <p className="mt-1 line-clamp-2 text-xs text-(--prose-2)">
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
                                className="text-[10px] text-(--prose-3)"
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
                    <p className="text-sm text-(--prose-3)">
                      Nothing in this family yet.
                    </p>
                  )}
                  {codexFiltered.length > PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setCodexExpanded((v) => !v)}
                      className="w-full rounded-lg border border-(--outline) bg-(--surface-raised) px-3 py-2 text-sm font-semibold text-(--prose-2) hover:border-(--prose-2) hover:text-(--prose)"
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
              <p className="text-sm text-(--prose-2)">No public rolls yet.</p>
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
                        className="w-full rounded-xl border border-(--outline) bg-(--surface) p-4 text-left transition hover:border-(--prose-2) hover:bg-(--surface-raised)"
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
                              <RarityBadge rarity={coerceRarity(r.rarity)} />
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                <FormattedCount value={r.totalEP} /> EP
                              </span>
                              <span className="text-sm text-(--prose-2)">
                                Top {topPercentFromEP(r.totalEP)}%
                              </span>
                              {r.attested && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${theme.chip}`}
                                >
                                  Sealed
                                </span>
                              )}
                              {r.challengeKey && (
                                <span className="text-xs font-mono text-(--prose-2)">
                                  {r.challengeKey}
                                </span>
                              )}
                            </div>
                            {r.topBadges && r.topBadges.length > 0 && (
                              <p className="mt-2 text-sm leading-snug text-(--prose-2)">
                                {r.topBadges.join(' · ')}
                                {r.badgeCount > (r.topBadges?.length ?? 0)
                                  ? ` · +${r.badgeCount - r.topBadges.length} more`
                                  : ''}
                              </p>
                            )}
                          </div>
                          <RelativeTime
                            iso={r.rolledAt}
                            className="shrink-0 text-sm text-(--prose-2)"
                          />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {profile.recentRolls.length > PREVIEW_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setRecentExpanded((v) => !v)}
                    className="w-full rounded-lg border border-(--outline) bg-(--surface-raised) px-3 py-2 text-sm font-semibold text-(--prose-2) hover:border-(--prose-2) hover:text-(--prose)"
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
      {lightbox && (
        <BadgeArtLightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
