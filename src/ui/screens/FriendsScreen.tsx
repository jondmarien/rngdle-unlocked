import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  FOLLOWING_LIST_QUERY_KEY,
  FOLLOWING_USERNAMES_QUERY_KEY,
  fetchFollowingList,
  unfollowUser,
  type FollowingListEntry,
} from '../../lib/notifications-api';
import { profileAvatarSrc } from '../../lib/profile-avatars';
import { accentStyles, normalizeAccent } from '../../lib/profile-theme';
import type { TabId } from '../../lib/routes';
import { FormattedCount } from '../components/FormattedCount';
import { QueryErrorBanner } from '../components/QueryErrorBanner';

export function FriendsScreen({
  onOpenProfile,
  onGoTab,
}: {
  onOpenProfile: (username: string) => void;
  onGoTab: (tab: TabId) => void;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: FOLLOWING_LIST_QUERY_KEY,
    queryFn: fetchFollowingList,
    enabled: Boolean(session?.user),
    staleTime: 30_000,
  });

  const friends = listQuery.data ?? [];

  const handleUnfollow = async (entry: FollowingListEntry) => {
    const username = entry.username;
    if (!username) return;
    const key = username.toLowerCase();
    setBusy(key);
    try {
      await unfollowUser(username);
      queryClient.setQueryData(
        FOLLOWING_LIST_QUERY_KEY,
        (prev: FollowingListEntry[] | undefined) =>
          (prev ?? []).filter((f) => (f.username ?? '').toLowerCase() !== key),
      );
      queryClient.setQueryData(
        FOLLOWING_USERNAMES_QUERY_KEY,
        (prev: Set<string> | undefined) => {
          const next = new Set(prev ?? []);
          next.delete(key);
          return next;
        },
      );
    } catch {
      /* keep list */
    } finally {
      setBusy(null);
    }
  };

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-(--prose-2)">
            People you follow. Sign in to manage your list.
          </p>
        </div>
        <p className="text-sm text-(--prose-2)">
          Sign in to see who you follow, then find players from Board → Find.
        </p>
        <button
          type="button"
          className="rounded-md border border-(--prose) bg-(--prose) px-3 py-2 text-sm font-bold text-(--bg)"
          onClick={() => onGoTab('account')}
        >
          Go to Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Friends</h1>
        <p className="text-sm text-(--prose-2)">
          People you follow. Their public rolls show on Feed; filter Board with
          Circle → Friends.
        </p>
      </div>

      {listQuery.isPending && (
        <p className="text-sm text-(--prose-2)">Loading friends…</p>
      )}
      {listQuery.error && (
        <QueryErrorBanner
          message={
            listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Failed to load'
          }
          onRetry={() => void listQuery.refetch()}
        />
      )}

      {!listQuery.isPending && !listQuery.error && friends.length === 0 && (
        <div className="rounded-lg border border-dashed border-(--outline) px-4 py-6 text-center text-sm text-(--prose-2)">
          <p>
            No friends yet. Search public @usernames on Find to follow players.
          </p>
          <button
            type="button"
            className="mt-3 rounded-md border border-(--prose) bg-(--prose) px-3 py-2 text-sm font-bold text-(--bg)"
            onClick={() => onGoTab('leaderboard')}
          >
            Open Board → Find
          </button>
        </div>
      )}

      <ul className="divide-y divide-(--outline) border border-(--outline)">
        {friends.map((f) => {
          const accent = normalizeAccent(f.profileAccent);
          const theme = accentStyles(accent);
          const uname = f.username?.toLowerCase() ?? '';
          const initial = (f.username?.[0] ?? f.name?.[0] ?? '?').toUpperCase();
          const avatarSrc =
            profileAvatarSrc(f.profileAvatar) ?? f.image ?? null;
          const ep = f.lifetimeEP ?? 0;
          return (
            <li
              key={f.userId}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--outline) bg-(--surface) text-sm font-bold ring-1 ${theme.ring}`}
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
                  <button
                    type="button"
                    className="truncate text-left font-bold hover:underline"
                    onClick={() => f.username && onOpenProfile(f.username)}
                    disabled={!f.username}
                  >
                    {f.username ? `@${f.username}` : f.name}
                  </button>
                  {f.profileFlair ? (
                    <p
                      className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${theme.chip}`}
                    >
                      {f.profileFlair}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-(--prose-3)">
                    <FormattedCount value={ep} /> EP
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!f.username || busy === uname}
                onClick={() => void handleUnfollow(f)}
                className="rounded-md border border-(--outline) px-3 py-2 text-xs font-bold uppercase tracking-wide text-(--prose-2) hover:bg-(--surface-raised)"
              >
                {busy === uname ? '…' : 'Unfollow'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
