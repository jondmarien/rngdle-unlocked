import { useEffect, useState } from 'react';
import { authClient, useSession } from '../../lib/auth-client';
import { createLogger, withTimeout } from '../../lib/logger';
import { fetchMe, patchMe, type LinkedAccount } from '../../lib/me-api';
import {
  PROFILE_AVATARS,
  normalizeProfileAvatar,
} from '../../lib/profile-avatars';
import {
  PROFILE_ACCENTS,
  accentStyles,
  normalizeAccent,
  type ProfileAccent,
} from '../../lib/profile-theme';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { useCloudSync } from '../../state/GameProvider';

const log = createLogger('account');

/** Cap how long we show “Loading session…” if getSession hangs/fails. */
const SESSION_WAIT_MS = 4000;
/** Sign-up / sign-in must not hang the UI forever. */
const AUTH_TIMEOUT_MS = 25_000;

export function AccountScreen({
  onOpenAdmin,
}: {
  onOpenAdmin?: () => void;
} = {}) {
  const { data: session, isPending, error, refetch } = useSession();
  const { syncToCloud, pullFromCloud, lastSyncAt, syncError, syncing } =
    useCloudSync();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [emailAuthTab, setEmailAuthTab] = useState<'magic' | 'password'>(
    'magic',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [profileAccent, setProfileAccent] = useState<ProfileAccent>('teal');
  const [profileBio, setProfileBio] = useState('');
  const [profileFlair, setProfileFlair] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileShowCodex, setProfileShowCodex] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  const { isAdmin } = useIsAdmin(session?.user?.id);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  useEffect(() => {
    log.debug('mount', {
      isPending,
      hasUser: Boolean(session?.user),
      error: error?.message,
    });
  }, []);

  // Better Auth OAuth errors land as ?error=… after redirect to /account
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (!oauthError) return;
    const nicer =
      oauthError === "email_doesn't_match" ||
      oauthError === 'email_doesnt_match'
        ? 'Could not link that provider — its email did not match your account email. Try again after the latest deploy (different emails are now allowed for Discord/GitHub).'
        : `Sign-in / link failed: ${oauthError.replace(/_/g, ' ')}`;
    setMsg(nicer);
    params.delete('error');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  }, []);

  useEffect(() => {
    log.debug('session state', {
      isPending,
      hasUser: Boolean(session?.user),
      error: error?.message ?? null,
    });
  }, [isPending, session?.user, error]);

  // Load vanity + username + linked OAuth from /api/me when signed in
  useEffect(() => {
    if (!session?.user) {
      setLinkedAccounts([]);
      return;
    }
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled || !data.user) return;
        if (data.user.username) setUsername(data.user.username);
        setProfileAccent(normalizeAccent(data.user.profileAccent));
        setProfileBio(data.user.profileBio ?? '');
        setProfileFlair(data.user.profileFlair ?? '');
        setProfileAvatar(normalizeProfileAvatar(data.user.profileAvatar));
        setProfileShowCodex(data.user.profileShowCodex !== false);
        setLinkedAccounts(data.linkedAccounts ?? []);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

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

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setStatus(null);
    log.info('magic-link:start', {
      email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });
    try {
      setStatus('Sending magic link…');
      const res = await withTimeout(
        authClient.signIn.magicLink({
          email,
          name: name || email.split('@')[0] || 'Player',
          callbackURL: '/account',
          newUserCallbackURL: '/account',
        }),
        AUTH_TIMEOUT_MS,
        'signIn.magicLink',
      );
      if (res.error) {
        throw new Error(res.error.message ?? 'Could not send magic link');
      }
      setMsg(
        'Check your inbox for a sign-in link (expires in ~10 minutes). Fake addresses will never get the email.',
      );
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Magic link failed';
      log.error('magic-link:fail', { message });
      setMsg(message);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

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
        setStatus(null);
        setMsg(
          'Account created — check your email for a verification link before signing in. Discord/GitHub skip this step.',
        );
        setMode('signin');
        setEmailAuthTab('magic');
        return;
      }

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
        const raw = res.error.message ?? 'Sign in failed';
        const nicer = /verif/i.test(raw)
          ? 'Email not verified yet — check your inbox for the verification link (or use a magic link).'
          : /user not found/i.test(raw) ||
              /invalid email or password/i.test(raw)
            ? 'No account for that email (or wrong password). Prefer Discord/GitHub, or request a magic link.'
            : raw;
        throw new Error(nicer);
      }
      setStatus('Refreshing session…');
      setMsg('Signed in.');

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

  const onSocial = async (provider: 'discord' | 'github') => {
    setBusy(true);
    setMsg(null);
    setStatus(`Redirecting to ${provider}…`);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: '/account',
      });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setStatus(null);
      setBusy(false);
    }
  };

  const refreshLinkedAccounts = async () => {
    try {
      const data = await fetchMe();
      setLinkedAccounts(data.linkedAccounts ?? []);
    } catch {
      /* ignore */
    }
  };

  const onLinkSocial = async (provider: 'discord' | 'github') => {
    setBusy(true);
    setMsg(null);
    setStatus(`Opening ${provider} to link…`);
    log.info('link-social:start', { provider });
    try {
      await authClient.linkSocial({
        provider,
        callbackURL: '/account',
      });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : `Link ${provider} failed`);
      setStatus(null);
      setBusy(false);
    }
  };

  const onUnlinkSocial = async (provider: 'discord' | 'github') => {
    const linked = linkedAccounts.find((a) => a.providerId === provider);
    if (!linked) return;
    const ok = window.confirm(
      `Unlink ${provider === 'discord' ? 'Discord' : 'GitHub'} (${linked.label})? You can link again later.`,
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await authClient.unlinkAccount({
        providerId: provider,
        accountId: linked.accountId,
      });
      if (res.error) {
        throw new Error(res.error.message ?? `Unlink ${provider} failed`);
      }
      await refreshLinkedAccounts();
      setMsg(
        `${provider === 'discord' ? 'Discord' : 'GitHub'} unlinked (${linked.label}).`,
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : `Unlink ${provider} failed`);
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
      const data = await patchMe({ username });
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

  const saveProfileVanity = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await patchMe({
        profileAccent,
        profileBio,
        profileFlair,
        profileAvatar,
        profileShowCodex,
      });
      setMsg('Profile look saved. Open your public /u page to preview.');
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
          Sign in to keep progress forever, auto-sync rolls, climb the board,
          follow friends, unlock public share links, and customize your public
          profile (username, accent, flair, bio, emblem avatar). First-time
          badge unlocks and secret masteries land in Alerts while signed in.
        </p>
        {(error || waitTimedOut) && !session?.user && (
          <p className="mt-1 text-xs text-[var(--prose-3)]">
            Not signed in
            {error ? ` (session check failed: ${error.message})` : ''}.
          </p>
        )}
      </div>

      {!session?.user ? (
        <div className="max-w-sm space-y-4">
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSocial('discord')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/15 px-4 py-2.5 text-sm font-bold text-[var(--prose)] disabled:opacity-50"
            >
              Continue with Discord
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSocial('github')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold text-[var(--prose)] disabled:opacity-50"
            >
              Continue with GitHub
            </button>
            <p className="text-[11px] text-[var(--prose-3)]">
              Recommended. Email below requires a real inbox (magic link or
              verification).
            </p>
          </div>
          <details className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[var(--prose-3)]">
              Or use email
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2 text-xs font-bold uppercase">
                <button
                  type="button"
                  className={
                    mode === 'signin' ? 'underline' : 'text-[var(--prose-3)]'
                  }
                  onClick={() => {
                    setMode('signin');
                    setEmailAuthTab('magic');
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={
                    mode === 'signup' ? 'underline' : 'text-[var(--prose-3)]'
                  }
                  onClick={() => setMode('signup')}
                >
                  Sign up
                </button>
              </div>

              {mode === 'signin' && (
                <div className="flex gap-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    className={
                      emailAuthTab === 'magic'
                        ? 'underline'
                        : 'text-[var(--prose-3)]'
                    }
                    onClick={() => setEmailAuthTab('magic')}
                  >
                    Magic link
                  </button>
                  <button
                    type="button"
                    className={
                      emailAuthTab === 'password'
                        ? 'underline'
                        : 'text-[var(--prose-3)]'
                    }
                    onClick={() => setEmailAuthTab('password')}
                  >
                    Password
                  </button>
                </div>
              )}

              {mode === 'signin' && emailAuthTab === 'magic' ? (
                <form
                  onSubmit={onMagicLink}
                  className="space-y-3"
                  autoComplete="on"
                >
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className="w-full border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="border-2 border-[var(--prose)] bg-[var(--prose)] px-4 py-2 text-xs font-bold uppercase text-[var(--bg)] disabled:opacity-50"
                  >
                    {busy ? (status ?? 'Working…') : 'Email me a sign-in link'}
                  </button>
                  <p className="text-[11px] text-[var(--prose-3)]">
                    Works for new and existing accounts. You must be able to
                    open the inbox.
                  </p>
                </form>
              ) : (
                <form onSubmit={onAuth} className="space-y-3" autoComplete="on">
                  {mode === 'signup' && (
                    <input
                      className="w-full border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
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
                    className="w-full border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    className="w-full border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
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
                      ? (status ?? 'Working…')
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Sign in with password'}
                  </button>
                  {mode === 'signup' && (
                    <p className="text-[11px] text-[var(--prose-3)]">
                      New email accounts must verify via the link we send.
                      Spoofed domains (e.g. fake @chron0.tech) will not work.
                    </p>
                  )}
                </form>
              )}
              {status && busy && (
                <p className="text-xs text-[var(--prose-3)]">{status}</p>
              )}
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-4 text-sm">
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <p className="text-[var(--prose-3)]">
              {session.user.username
                ? `@${session.user.username}`
                : 'No username yet'}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                className="text-xs font-bold uppercase underline"
                onClick={() => void onSignOut()}
              >
                Sign out
              </button>
              {isAdmin && onOpenAdmin && (
                <button
                  type="button"
                  className="text-xs font-bold uppercase underline text-amber-700 dark:text-amber-400"
                  onClick={onOpenAdmin}
                >
                  Admin panel
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold text-[var(--prose)]">
              Linked sign-in
            </p>
            <p className="text-xs text-[var(--prose-3)]">
              Connect Discord and/or GitHub to this account. Linked providers
              show the connected handle; unlink anytime.
            </p>
            {(['discord', 'github'] as const).map((provider) => {
              const linked = linkedAccounts.find(
                (a) => a.providerId === provider,
              );
              const label = provider === 'discord' ? 'Discord' : 'GitHub';
              return (
                <div
                  key={provider}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--outline)] bg-[var(--bg)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--prose)]">
                      {label}
                    </p>
                    <p className="truncate text-xs text-[var(--prose-3)]">
                      {linked ? `Linked as ${linked.label}` : 'Not linked'}
                    </p>
                  </div>
                  {linked ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onUnlinkSocial(provider)}
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                        provider === 'discord'
                          ? 'border-[#5865F2]/40'
                          : 'border-[var(--outline)]'
                      }`}
                    >
                      Unlink {label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onLinkSocial(provider)}
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                        provider === 'discord'
                          ? 'border-[#5865F2]/40'
                          : 'border-[var(--outline)]'
                      }`}
                    >
                      Link {label}
                    </button>
                  )}
                </div>
              );
            })}
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
              className="border border-[var(--prose)] px-3 py-2 text-sm font-semibold"
              onClick={() => void saveUsername()}
            >
              Save username
            </button>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
            <div>
              <h2 className="text-base font-bold text-[var(--prose)]">
                Public profile look
              </h2>
              <p className="text-sm text-[var(--prose-2)]">
                Picture, accent, flair, and bio on{' '}
                <code className="text-xs">/u/yourname</code>. Requires a
                username.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-[var(--prose-2)]">
                Profile picture
              </p>
              <p className="mb-2 text-xs text-[var(--prose-3)]">
                Pick a custom emblem, or None for initial / linked account
                photo.
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                <button
                  type="button"
                  onClick={() => setProfileAvatar('')}
                  title="None"
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold ${
                    profileAvatar === ''
                      ? 'border-[var(--prose)] bg-[var(--surface-raised)] ring-2 ring-[var(--accent)]/40'
                      : 'border-[var(--outline)] bg-[var(--bg)] text-[var(--prose-2)]'
                  }`}
                >
                  <span className="text-lg font-bold" aria-hidden>
                    A
                  </span>
                  <span className="mt-0.5 text-[10px]">None</span>
                </button>
                {PROFILE_AVATARS.map((av) => {
                  const selected = profileAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setProfileAvatar(av.id)}
                      title={av.label}
                      className={`aspect-square overflow-hidden rounded-xl border-2 p-0.5 ${
                        selected
                          ? 'border-[var(--prose)] ring-2 ring-[var(--accent)]/50'
                          : 'border-[var(--outline)] opacity-90 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={av.src}
                        alt={av.label}
                        className="h-full w-full rounded-[0.6rem] object-cover"
                      />
                    </button>
                  );
                })}
              </div>
              {profileAvatar !== '' && (
                <p className="mt-1.5 text-xs text-[var(--prose-2)]">
                  Selected:{' '}
                  <span className="font-semibold">
                    {PROFILE_AVATARS.find((a) => a.id === profileAvatar)
                      ?.label ?? profileAvatar}
                  </span>
                </p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-[var(--prose-2)]">
                Accent
              </p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_ACCENTS.map((a) => {
                  const t = accentStyles(a);
                  const selected = profileAccent === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setProfileAccent(a)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                        selected
                          ? `${t.chip} ring-2 ${t.ring}`
                          : 'border-[var(--outline)] text-[var(--prose-2)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--prose-2)]">
                Flair (optional)
              </label>
              <input
                value={profileFlair}
                onChange={(e) => setProfileFlair(e.target.value.slice(0, 48))}
                maxLength={48}
                placeholder="e.g. Anomaly hunter"
                className="w-full border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-[var(--prose-2)]">
                Bio (optional, 160 chars)
              </label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value.slice(0, 160))}
                maxLength={160}
                rows={3}
                placeholder="A short line for your public profile."
                className="w-full resize-y border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-[var(--prose-2)]">
                {profileBio.length}/160
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2.5 text-sm text-[var(--prose)]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={profileShowCodex}
                  onChange={(e) => setProfileShowCodex(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">
                    Show codex on public profile
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--prose-3)]">
                    When on, visitors to{' '}
                    <code className="text-[11px]">/u/yourname</code> see your
                    unlocked badges (not locked spoilers). Default on.
                  </span>
                </span>
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveProfileVanity()}
              className="border-2 border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-50"
            >
              Save profile look
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[var(--prose)]">
              Cloud sync
            </h2>
            <p className="text-xs text-[var(--prose-3)]">
              While signed in, every new roll is auto-pushed to the cloud
              (merge-safe). Manual pull/push still available for catch-up.
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
              <p className="text-xs text-red-600 dark:text-red-400">
                {syncError}
              </p>
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
