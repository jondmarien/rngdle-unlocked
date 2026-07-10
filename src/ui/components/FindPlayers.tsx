import { useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  followUser,
  searchUsers,
  unfollowUser,
} from '../../lib/notifications-api';

export function FindPlayers({
  following,
  onFollowingChange,
  onOpenProfile,
}: {
  following: Set<string>;
  onFollowingChange: (next: Set<string>) => void;
  onOpenProfile: (username: string) => void;
}) {
  const { data: session } = useSession();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ username: string; name: string }[]>(
    [],
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session?.user) {
    return (
      <p className="text-sm text-(--prose-2)">
        Sign in to search usernames and follow players.
      </p>
    );
  }

  const runSearch = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const users = await searchUsers(q.trim());
      setResults(users);
      if (users.length === 0) setMsg('No users found.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (username: string) => {
    const key = username.toLowerCase();
    setBusy(true);
    setMsg(null);
    try {
      if (following.has(key)) {
        await unfollowUser(username);
        const next = new Set(following);
        next.delete(key);
        onFollowingChange(next);
        setMsg(`Unfollowed @${username}`);
      } else {
        await followUser(username);
        const next = new Set(following);
        next.add(key);
        onFollowingChange(next);
        setMsg(`Following @${username}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) p-3">
      <div>
        <h2 className="text-base font-bold text-(--prose)">Find players</h2>
        <p className="text-sm text-(--prose-2)">
          Search public @usernames (min 2 characters). Follow to see their
          public rolls on the Feed.
        </p>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="@username"
          className="min-w-[10rem] flex-1 border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || q.trim().length < 2}
          className="rounded-md border-2 border-(--prose) bg-(--prose) px-3 py-2 text-sm font-semibold text-(--bg) disabled:opacity-40"
        >
          Search
        </button>
      </form>
      {msg && <p className="text-sm text-(--prose-2)">{msg}</p>}
      <ul className="divide-y divide-(--outline)">
        {results.map((u) => {
          const isFollowing = following.has(u.username.toLowerCase());
          return (
            <li
              key={u.username}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <button
                type="button"
                className="text-left font-semibold hover:underline"
                onClick={() => onOpenProfile(u.username)}
              >
                @{u.username}
                <span className="ml-2 text-sm font-normal text-(--prose-2)">
                  {u.name}
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggle(u.username)}
                className={`rounded-md border px-2.5 py-1.5 text-sm font-semibold ${
                  isFollowing
                    ? 'border-(--outline) text-(--prose-2)'
                    : 'border-(--prose) bg-(--prose) text-(--bg)'
                }`}
              >
                {isFollowing ? 'Following' : '+ Follow'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
