import { useEffect, useState } from 'react';
import { authClient, useSession } from '../../lib/auth-client';
import { useGame } from '../../state/GameProvider';

/** Cap how long we show “Loading session…” if getSession hangs/fails. */
const SESSION_WAIT_MS = 4000;

export function AccountScreen() {
  const { data: session, isPending, error, refetch } = useSession();
  const { syncToCloud, pullFromCloud, lastSyncAt, syncError, syncing } =
    useGame();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waitTimedOut, setWaitTimedOut] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setWaitTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setWaitTimedOut(true), SESSION_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [isPending]);

  const sessionLoading = isPending && !error && !waitTimedOut;

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signup') {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0] || 'Player',
        });
        if (res.error) throw new Error(res.error.message ?? 'Sign up failed');
        setMsg('Account created — signed in.');
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? 'Sign in failed');
        setMsg('Signed in.');
      }
      await refetch();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    await authClient.signOut();
    await refetch();
    setMsg('Signed out.');
  };

  const saveUsername = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = (await res.json()) as { error?: string; username?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setMsg(`Username set to @${data.username}`);
      await refetch();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (sessionLoading) {
    return <p className="text-sm text-[var(--prose-3)]">Loading session…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">Account</h1>
        <p className="text-xs text-[var(--prose-3)]">
          Part 2 social — sign in to sync progress to Neon (via Vercel).
        </p>
        {(error || waitTimedOut) && !session?.user && (
          <p className="mt-1 text-xs text-[var(--prose-3)]">
            Not signed in
            {error ? ` (session check failed: ${error.message})` : ''}.
          </p>
        )}
      </div>

      {!session?.user ? (
        <form onSubmit={onAuth} className="max-w-sm space-y-3">
          <div className="flex gap-2 text-xs font-bold uppercase">
            <button
              type="button"
              className={mode === 'signin' ? 'underline' : 'text-[var(--prose-3)]'}
              onClick={() => setMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'underline' : 'text-[var(--prose-3)]'}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
          </div>
          {mode === 'signup' && (
            <input
              className="w-full border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="Display name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
            placeholder="Password (8+)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="border-2 border-[var(--prose)] bg-[var(--prose)] px-4 py-2 text-xs font-bold uppercase text-[var(--bg)] disabled:opacity-50"
          >
            {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-4 text-sm">
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <p className="text-[var(--prose-3)]">
              {(session.user as { username?: string }).username
                ? `@${(session.user as { username?: string }).username}`
                : 'No username yet'}
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-bold uppercase underline"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              className="border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm"
              placeholder="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
              onClick={saveUsername}
            >
              Save username
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
              Cloud sync
            </h2>
            <p className="text-xs text-[var(--prose-3)]">
              Merges local + cloud (max counters, union collection, merge history).
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={syncing}
                className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
                onClick={() => void pullFromCloud()}
              >
                Pull from cloud
              </button>
              <button
                type="button"
                disabled={syncing}
                className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]"
                onClick={() => void syncToCloud()}
              >
                Push / merge to cloud
              </button>
            </div>
            {lastSyncAt && (
              <p className="text-xs text-[var(--prose-3)]">
                Last sync: {new Date(lastSyncAt).toLocaleString()}
              </p>
            )}
            {syncError && (
              <p className="text-xs text-red-600 dark:text-red-400">{syncError}</p>
            )}
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-[var(--prose-2)]">{msg}</p>}
    </div>
  );
}
