import { useEffect, useState } from 'react';
import { authClient, useSession } from '../../lib/auth-client';
import { createLogger, withTimeout } from '../../lib/logger';
import { useGame } from '../../state/GameProvider';

const log = createLogger('account');

/** Cap how long we show “Loading session…” if getSession hangs/fails. */
const SESSION_WAIT_MS = 4000;
/** Sign-up / sign-in must not hang the UI forever. */
const AUTH_TIMEOUT_MS = 25_000;

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
  const [status, setStatus] = useState<string | null>(null);
  const [waitTimedOut, setWaitTimedOut] = useState(false);

  useEffect(() => {
    log.debug('mount', {
      isPending,
      hasUser: Boolean(session?.user),
      error: error?.message,
    });
  }, []);

  useEffect(() => {
    log.debug('session state', {
      isPending,
      hasUser: Boolean(session?.user),
      error: error?.message ?? null,
    });
  }, [isPending, session?.user, error]);

  useEffect(() => {
    if (!isPending) {
      setWaitTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => {
      log.warn('session wait timed out');
      setWaitTimedOut(true);
    }, SESSION_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [isPending]);

  const sessionLoading = isPending && !error && !waitTimedOut;

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setStatus(null);

    const action = mode === 'signup' ? 'sign-up' : 'sign-in';
    log.info(`${action}:start`, {
      email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
      hasName: Boolean(name),
    });

    try {
      if (mode === 'signup') {
        setStatus('Creating account…');
        const res = await withTimeout(
          authClient.signUp.email({
            email,
            password,
            name: name || email.split('@')[0] || 'Player',
          }),
          AUTH_TIMEOUT_MS,
          'signUp.email',
        );
        log.info('sign-up:response', {
          hasError: Boolean(res.error),
          error: res.error?.message,
          hasData: Boolean(res.data),
        });
        if (res.error) {
          throw new Error(res.error.message ?? 'Sign up failed');
        }
        setStatus('Refreshing session…');
        setMsg('Account created — signed in.');
      } else {
        setStatus('Signing in…');
        const res = await withTimeout(
          authClient.signIn.email({ email, password }),
          AUTH_TIMEOUT_MS,
          'signIn.email',
        );
        log.info('sign-in:response', {
          hasError: Boolean(res.error),
          error: res.error?.message,
          hasData: Boolean(res.data),
        });
        if (res.error) {
          throw new Error(res.error.message ?? 'Sign in failed');
        }
        setStatus('Refreshing session…');
        setMsg('Signed in.');
      }

      try {
        await withTimeout(refetch(), 10_000, 'session.refetch');
        log.info('session refetch ok');
      } catch (refetchErr) {
        log.warn('session refetch failed (auth may still have succeeded)', {
          err:
            refetchErr instanceof Error
              ? refetchErr.message
              : String(refetchErr),
        });
        setMsg((m) =>
          m
            ? `${m} (session refresh slow — try reloading)`
            : 'Signed in, but session refresh timed out — reload the page.',
        );
      }
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Auth failed';
      log.error(`${action}:fail`, { message });
      setMsg(message);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    log.info('sign-out:start');
    setBusy(true);
    try {
      await withTimeout(authClient.signOut(), 10_000, 'signOut');
      await withTimeout(refetch(), 10_000, 'session.refetch').catch(() => {});
      setMsg('Signed out.');
      log.info('sign-out:ok');
    } catch (err) {
      log.error('sign-out:fail', {
        err: err instanceof Error ? err.message : String(err),
      });
      setMsg(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setBusy(false);
    }
  };

  const saveUsername = async () => {
    setBusy(true);
    setMsg(null);
    log.info('username:save', { username });
    try {
      const res = await withTimeout(
        fetch('/api/me', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        }),
        15_000,
        'PATCH /api/me',
      );
      const data = (await res.json()) as { error?: string; username?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      log.info('username:ok', { username: data.username });
      setMsg(`Username set to @${data.username}`);
      await refetch().catch(() => {});
    } catch (err) {
      log.error('username:fail', {
        err: err instanceof Error ? err.message : String(err),
      });
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
            {busy
              ? status ?? 'Working…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
          {status && busy && (
            <p className="text-xs text-[var(--prose-3)]">{status}</p>
          )}
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
              onClick={() => void onSignOut()}
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
              onClick={() => void saveUsername()}
            >
              Save username
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--prose-3)]">
              Cloud sync
            </h2>
            <p className="text-xs text-[var(--prose-3)]">
              While signed in, every new roll is auto-pushed to the cloud (merge-safe).
              Manual pull/push still available for catch-up.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={syncing}
                className="border border-[var(--prose)] px-3 py-2 text-xs font-bold uppercase"
                onClick={() => {
                  log.info('pull clicked');
                  void pullFromCloud();
                }}
              >
                Pull from cloud
              </button>
              <button
                type="button"
                disabled={syncing}
                className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-xs font-bold uppercase text-[var(--bg)]"
                onClick={() => {
                  log.info('push clicked');
                  void syncToCloud();
                }}
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

      {msg && (
        <p
          className={`text-sm ${
            msg.toLowerCase().includes('fail') ||
            msg.toLowerCase().includes('error') ||
            msg.toLowerCase().includes('timeout')
              ? 'text-red-600 dark:text-red-400'
              : 'text-[var(--prose-2)]'
          }`}
        >
          {msg}
        </p>
      )}

      <p className="text-[10px] text-[var(--prose-3)]">
        Debug: open console for <code>[rngdle:*]</code> logs ·{' '}
        <code>__rngdleLog.dump()</code> ·{' '}
        <code>__rngdleLog.setLevel(&apos;debug&apos;)</code>
      </p>
    </div>
  );
}
