import { useEffect, useRef, useState } from 'react';
import { authClient, useSession } from '../../lib/auth-client';
import {
  createCheckout,
  openBillingPortal,
  type PaidRankedTier,
} from '../../lib/checkout-api';
import { createLogger, withTimeout } from '../../lib/logger';
import { fetchMe, patchMe, type LinkedAccount } from '../../lib/me-api';
import {
  freeProfileAvatars,
  getProfileAvatar,
  isAvatarUnlocked,
  normalizeProfileAvatar,
  tierProfileAvatars,
  tipRingClassForTier,
} from '../../lib/profile-avatars';
import {
  defaultFrameForTier,
  framesForPicker,
  getProfileFrame,
  isFrameUnlocked,
  normalizeProfileFrame,
  type ProfileFrameId,
} from '../../lib/profile-frames';
import {
  PROFILE_ACCENTS,
  accentStyles,
  normalizeAccent,
  type ProfileAccent,
} from '../../lib/profile-theme';
import type { RankedTier } from '../../lib/ranked-limits';
import {
  RANKED_PLUS_CATALOG,
  tierChipClass,
} from '../../lib/ranked-plus-catalog';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { useCloudSync } from '../../state/GameProvider';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { UnlockTipPopover } from '../components/UnlockTipPopover';
import { useFeedback } from '../feedback';

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
  const {
    syncToCloud,
    pullFromCloud,
    lastSyncAt,
    syncError,
    syncing,
    settingsSyncEnabled,
    setSettingsSyncEnabledFlag,
  } = useCloudSync();
  const { confirmAsync } = useFeedback();
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
  const [profileFrame, setProfileFrame] = useState<ProfileFrameId>('none');
  const [rankedTier, setRankedTier] = useState<RankedTier>('free');
  const [hasPolarBilling, setHasPolarBilling] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [highlightTier, setHighlightTier] = useState<PaidRankedTier | null>(
    null,
  );
  const rankedPlusRef = useRef<HTMLDivElement>(null);
  const [profileShowCodex, setProfileShowCodex] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
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

  // Ranked Plus deep links: ?upgrade= · ?checkout=success|cancel
  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user) return;
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get('upgrade');
    const checkout = params.get('checkout');
    let dirty = false;

    if (upgrade === 'rare' || upgrade === 'epic' || upgrade === 'anomaly') {
      setHighlightTier(upgrade);
      rankedPlusRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      params.delete('upgrade');
      dirty = true;
    }

    if (checkout === 'cancel') {
      setMsg('Checkout cancelled — no charge. You can try again anytime.');
      params.delete('checkout');
      params.delete('tier');
      params.delete('checkout_id');
      dirty = true;
    }

    if (checkout === 'success') {
      const wantTier = params.get('tier');
      setMsg('Payment received — unlocking Ranked Plus…');
      let tries = 0;
      const poll = window.setInterval(() => {
        tries += 1;
        void fetchMe()
          .then((data) => {
            if (!data.user) return;
            const tier = (data.user.rankedTier ?? 'free') as RankedTier;
            setRankedTier(tier);
            setHasPolarBilling(Boolean(data.user.hasPolarBilling));
            if (
              tier !== 'free' &&
              (!wantTier || tier === wantTier || tries >= 8)
            ) {
              window.clearInterval(poll);
              setMsg(
                `Ranked Plus · ${tier} is active. Frames and emblems are unlocked — save your look below.`,
              );
              if (normalizeProfileFrame(data.user.profileFrame) === 'none') {
                setProfileFrame(defaultFrameForTier(tier));
              }
            }
          })
          .catch(() => {});
        if (tries >= 12) {
          window.clearInterval(poll);
          setMsg(
            'Payment received. If Ranked Plus is not active yet, wait a moment and refresh — webhooks can lag a few seconds.',
          );
        }
      }, 1200);
      params.delete('checkout');
      params.delete('tier');
      params.delete('checkout_id');
      dirty = true;
      return () => window.clearInterval(poll);
    }

    if (dirty) {
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', next);
    }
  }, [session?.user?.id]);

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
        const tier = (data.user.rankedTier ?? 'free') as RankedTier;
        setRankedTier(tier);
        setHasPolarBilling(Boolean(data.user.hasPolarBilling));
        let frame = normalizeProfileFrame(data.user.profileFrame);
        if (frame === 'none' && tier !== 'free') {
          frame = defaultFrameForTier(tier);
        }
        setProfileFrame(frame);
        setProfileShowCodex(data.user.profileShowCodex !== false);
        setLinkedAccounts(data.linkedAccounts ?? []);
        setSettingsSyncEnabledFlag(Boolean(data.settingsSyncEnabled));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, setSettingsSyncEnabledFlag]);

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
    const ok = await confirmAsync({
      title: 'Unlink account?',
      body: `Unlink ${provider === 'discord' ? 'Discord' : 'GitHub'} (${linked.label})? You can link again later.`,
      confirmLabel: 'Unlink',
      danger: true,
    });
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

  const onRequestAccountDelete = async () => {
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
      setMsg('Type DELETE to confirm account deletion.');
      return;
    }
    const ok = await confirmAsync({
      title: 'Delete cloud account?',
      body: 'Permanently delete your cloud account? You will get a confirmation email. Local browser saves stay until you clear site data.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    log.info('delete-account:start');
    try {
      const payload: { callbackURL: string; password?: string } = {
        callbackURL: '/',
      };
      if (deletePassword.trim()) payload.password = deletePassword;
      const res = await withTimeout(
        authClient.deleteUser(payload),
        AUTH_TIMEOUT_MS,
        'deleteUser',
      );
      if (res.error) {
        throw new Error(res.error.message ?? 'Account deletion failed');
      }
      setDeletePassword('');
      setDeleteConfirm('');
      setMsg(
        'Check your email for a confirmation link to finish deleting your account. If you already used a fresh password confirm, you may be signed out already.',
      );
      await withTimeout(refetch(), 10_000, 'session.refetch').catch(() => {});
      log.info('delete-account:ok');
    } catch (err) {
      log.error('delete-account:fail', {
        err: err instanceof Error ? err.message : String(err),
      });
      setMsg(
        err instanceof Error
          ? err.message
          : 'Account deletion failed. Sign in again (fresh session) and retry, or email jon@chron0.tech.',
      );
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
        profileFrame,
        profileShowCodex,
      });
      window.dispatchEvent(new Event('rngdle:me-updated'));
      setMsg('Profile look saved. Open your public /u page to preview.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const startCheckout = async (tier: PaidRankedTier) => {
    if (!username.trim()) {
      setMsg('Claim a public @username before Ranked Plus checkout.');
      return;
    }
    setCheckoutBusy(true);
    setMsg('Continuing to secure checkout…');
    try {
      const { url } = await createCheckout({
        tier,
        discountCode: friendCode.trim() || undefined,
      });
      window.location.href = url;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Checkout failed');
      setCheckoutBusy(false);
    }
  };

  const startPortal = async () => {
    setCheckoutBusy(true);
    setMsg(null);
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Portal unavailable');
      setCheckoutBusy(false);
    }
  };

  if (sessionLoading) {
    return <p className="text-sm text-(--prose-3)">Loading session…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider">Account</h1>
        <p className="text-xs text-(--prose-3)">
          Sign in to keep progress forever, auto-sync rolls, climb the board,
          follow friends, unlock public share links, and customize your public
          profile (username, accent, flair, bio, emblem avatar). First-time
          badge unlocks and secret masteries land in Alerts while signed in.
        </p>
        {(error || waitTimedOut) && !session?.user && (
          <p className="mt-1 text-xs text-(--prose-3)">
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/15 px-4 py-2.5 text-sm font-bold text-(--prose) disabled:opacity-50"
            >
              Continue with Discord
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSocial('github')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-(--outline) bg-(--surface) px-4 py-2.5 text-sm font-bold text-(--prose) disabled:opacity-50"
            >
              Continue with GitHub
            </button>
            <p className="text-[11px] text-(--prose-3)">
              Recommended. Email below requires a real inbox (magic link or
              verification).
            </p>
          </div>
          <details className="rounded-lg border border-(--outline) bg-(--surface) p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-(--prose-3)">
              Or use email
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2 text-xs font-bold uppercase">
                <button
                  type="button"
                  className={
                    mode === 'signin' ? 'underline' : 'text-(--prose-3)'
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
                    mode === 'signup' ? 'underline' : 'text-(--prose-3)'
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
                        : 'text-(--prose-3)'
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
                        : 'text-(--prose-3)'
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
                    className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="border-2 border-(--accent) bg-(--accent) px-4 py-2 text-xs font-bold uppercase text-(--bg) disabled:opacity-50"
                  >
                    {busy ? (status ?? 'Working…') : 'Email me a sign-in link'}
                  </button>
                  <p className="text-[11px] text-(--prose-3)">
                    Works for new and existing accounts. You must be able to
                    open the inbox.
                  </p>
                </form>
              ) : (
                <form onSubmit={onAuth} className="space-y-3" autoComplete="on">
                  {mode === 'signup' && (
                    <input
                      className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
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
                    className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
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
                    className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
                    placeholder="Password (8+)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="border-2 border-(--accent) bg-(--accent) px-4 py-2 text-xs font-bold uppercase text-(--bg) disabled:opacity-50"
                  >
                    {busy
                      ? (status ?? 'Working…')
                      : mode === 'signup'
                        ? 'Create account'
                        : 'Sign in with password'}
                  </button>
                  {mode === 'signup' && (
                    <p className="text-[11px] text-(--prose-3)">
                      New email accounts must verify via the link we send.
                      Spoofed domains (e.g. fake @chron0.tech) will not work.
                    </p>
                  )}
                </form>
              )}
              {status && busy && (
                <p className="text-xs text-(--prose-3)">{status}</p>
              )}
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-(--outline) bg-(--surface) p-4 text-sm">
            <p>
              Signed in as <strong>{session.user.email}</strong>
            </p>
            <p className="text-(--prose-3)">
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

          <div className="space-y-2 rounded-xl border border-(--outline) bg-(--surface) p-4">
            <p className="text-sm font-semibold text-(--prose)">
              Linked sign-in
            </p>
            <p className="text-xs text-(--prose-3)">
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--outline) bg-(--bg) px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-(--prose)">
                      {label}
                    </p>
                    <p className="truncate text-xs text-(--prose-3)">
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
                          : 'border-(--outline)'
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
                          : 'border-(--outline)'
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
              className="border border-(--outline) bg-(--surface) px-3 py-2 text-sm"
              placeholder="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              className="border border-(--prose) px-3 py-2 text-sm font-semibold"
              onClick={() => void saveUsername()}
            >
              Save username
            </button>
          </div>

          <div
            ref={rankedPlusRef}
            className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-(--prose)">
                  Ranked Plus
                </h2>
                <p className="text-sm text-(--prose-2)">
                  Raise your Ranked hour cap and unlock frames + emblems.
                  Checkout is handled securely by Polar.
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${tierChipClass(rankedTier)}`}
              >
                {rankedTier === 'free'
                  ? 'Free · 90/h'
                  : `Ranked Plus · ${rankedTier}`}
              </span>
            </div>
            {isAdmin && rankedTier !== 'free' && !hasPolarBilling && (
              <p className="text-xs text-(--prose-3)">
                Admin complimentary access — full Anomaly cosmetics and quota
                without a Polar purchase. Manage billing appears after a real
                subscription.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              {RANKED_PLUS_CATALOG.map((card) => {
                const current = rankedTier === card.tier;
                const highlighted = highlightTier === card.tier;
                return (
                  <div
                    key={card.tier}
                    className={`flex flex-col rounded-lg border-2 bg-(--bg) p-3 ${card.borderClass} ${
                      highlighted ? 'ring-2 ring-(--accent)/50' : ''
                    }`}
                  >
                    <p className="font-display text-lg font-bold text-(--prose)">
                      {card.label}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-(--prose-2)">
                      {card.rollsPerHour}/h · {card.priceCad}/mo
                    </p>
                    <p className="mt-1 flex-1 text-xs text-(--prose-3)">
                      {card.cosmetics}
                    </p>
                    <button
                      type="button"
                      disabled={checkoutBusy || current}
                      className="mt-3 border-2 border-(--accent) bg-(--accent) px-2 py-1.5 text-xs font-bold uppercase text-(--bg) disabled:opacity-50"
                      onClick={() => void startCheckout(card.tier)}
                    >
                      {current
                        ? 'Current'
                        : rankedTier === 'free'
                          ? 'Subscribe'
                          : 'Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-(--prose-2)">
                Friend code (optional)
              </label>
              <input
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.slice(0, 64))}
                placeholder="Discount code"
                className="w-full border border-(--outline) bg-(--bg) px-3 py-2 font-mono text-sm"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-(--prose-3)">
                You can also enter a code on Polar&apos;s checkout page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-(--prose-3)">
              {hasPolarBilling && (
                <button
                  type="button"
                  disabled={checkoutBusy}
                  className="font-semibold text-(--accent) underline-offset-2 hover:underline disabled:opacity-50"
                  onClick={() => void startPortal()}
                >
                  Manage billing
                </button>
              )}
              <a className="underline" href="/payments">
                Payments
              </a>
              <a className="underline" href="/terms">
                Terms
              </a>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-(--outline) bg-(--surface) p-4">
            <div>
              <h2 className="text-base font-bold text-(--prose)">
                Public profile look
              </h2>
              <p className="text-sm text-(--prose-2)">
                Picture, frame, accent, flair, and bio on{' '}
                <code className="text-xs">/u/yourname</code>. Requires a
                username.
              </p>
            </div>
            <div className="flex items-center gap-3 overflow-visible rounded-lg border border-(--outline) bg-(--bg) p-3 pt-4">
              <ProfileAvatar
                username={username || session?.user?.name}
                image={session?.user?.image}
                avatarId={profileAvatar}
                frameId={profileFrame}
                accentRingClass={accentStyles(profileAccent).ring}
                size="md"
              />
              <div className="min-w-0 text-sm text-(--prose-2)">
                <p className="font-semibold text-(--prose)">Preview</p>
                <p className="text-xs text-(--prose-3)">
                  Frame: {getProfileFrame(profileFrame).label}
                  {rankedTier !== 'free' ? ` · Ranked Plus ${rankedTier}` : ''}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-(--prose-2)">
                Profile frame
              </p>
              <p className="mb-2 text-xs text-(--prose-3)">
                Swipe for Ranked Plus frames. Locked frames stay dim until you
                subscribe.
              </p>
              <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-visible py-2">
                {framesForPicker().map((fr) => {
                  const unlocked = isFrameUnlocked(fr.id, rankedTier);
                  const selected = profileFrame === fr.id;
                  const cell = (
                    <div
                      className={`relative flex h-[4.5rem] w-16 shrink-0 snap-start flex-col items-center justify-start gap-1 rounded-xl border-2 px-1 pt-2 pb-1 ${
                        selected
                          ? 'border-(--prose) bg-(--surface-raised)'
                          : 'border-(--outline)'
                      }`}
                    >
                      <span
                        className={`size-8 shrink-0 rounded-full border border-(--outline) bg-(--surface) ${fr.ringClass} ${
                          unlocked
                            ? ''
                            : 'grayscale brightness-75 contrast-90 blur-[0.5px]'
                        }`}
                        aria-hidden
                      />
                      <span className="max-w-full truncate text-[9px] font-semibold text-(--prose-2)">
                        {fr.label}
                      </span>
                      {!unlocked && (
                        <span
                          className={`absolute top-1 right-1 size-1.5 rounded-full ${fr.tipColorClass}`}
                          aria-hidden
                        />
                      )}
                    </div>
                  );
                  if (!unlocked) {
                    return (
                      <div key={fr.id} className="relative shrink-0">
                        <UnlockTipPopover minTier={fr.minTier} kind="frame">
                          {cell}
                        </UnlockTipPopover>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={fr.id}
                      type="button"
                      onClick={() => setProfileFrame(fr.id)}
                      title={fr.label}
                      className="relative shrink-0"
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-(--prose-2)">
                Profile picture
              </p>
              <p className="mb-2 text-xs text-(--prose-3)">
                Pick a custom emblem, or None for initial / linked account
                photo. Ranked Plus seals unlock cumulatively (4 / 8 / 12).
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                <button
                  type="button"
                  onClick={() => setProfileAvatar('')}
                  title="None"
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold ${
                    profileAvatar === ''
                      ? 'border-(--prose) bg-(--surface-raised) ring-2 ring-(--accent)/40'
                      : 'border-(--outline) bg-(--bg) text-(--prose-2)'
                  }`}
                >
                  <span className="text-lg font-bold" aria-hidden>
                    A
                  </span>
                  <span className="mt-0.5 text-[10px]">None</span>
                </button>
                {freeProfileAvatars().map((av) => {
                  const selected = profileAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setProfileAvatar(av.id)}
                      title={av.label}
                      className={`aspect-square overflow-hidden rounded-xl border-2 p-0.5 ${
                        selected
                          ? 'border-(--prose) ring-2 ring-(--accent)/50'
                          : 'border-(--outline) opacity-90 hover:opacity-100'
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
              <p className="mt-3 mb-1.5 text-sm font-semibold text-(--prose-2)">
                Ranked Plus emblems
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {tierProfileAvatars().map((av) => {
                  const minTier = av.minTier ?? 'free';
                  const unlocked = isAvatarUnlocked(av.id, rankedTier);
                  const selected = profileAvatar === av.id;
                  const img = (
                    <div
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 p-0.5 ${
                        selected
                          ? 'border-(--prose) ring-2 ring-(--accent)/50'
                          : tipRingClassForTier(minTier)
                      }`}
                    >
                      <img
                        src={av.src}
                        alt={unlocked ? av.label : `${av.label} (locked)`}
                        className={`h-full w-full rounded-[0.6rem] object-cover ${
                          unlocked
                            ? ''
                            : 'grayscale brightness-[0.65] contrast-90 blur-[0.6px] saturate-0'
                        }`}
                      />
                    </div>
                  );
                  if (!unlocked) {
                    return (
                      <UnlockTipPopover
                        key={av.id}
                        minTier={minTier}
                        kind="avatar"
                      >
                        {img}
                      </UnlockTipPopover>
                    );
                  }
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setProfileAvatar(av.id)}
                      title={av.label}
                      className="p-0"
                    >
                      {img}
                    </button>
                  );
                })}
              </div>
              {profileAvatar !== '' && (
                <p className="mt-1.5 text-xs text-(--prose-2)">
                  Selected:{' '}
                  <span className="font-semibold">
                    {getProfileAvatar(profileAvatar)?.label ?? profileAvatar}
                  </span>
                </p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-(--prose-2)">
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
                          : 'border-(--outline) text-(--prose-2)'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-(--prose-2)">
                Flair (optional)
              </label>
              <input
                value={profileFlair}
                onChange={(e) => setProfileFlair(e.target.value.slice(0, 48))}
                maxLength={48}
                placeholder="e.g. Anomaly hunter"
                className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-(--prose-2)">
                Bio (optional, 160 chars)
              </label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value.slice(0, 160))}
                maxLength={160}
                rows={3}
                placeholder="A short line for your public profile."
                className="w-full resize-y border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-(--prose-2)">
                {profileBio.length}/160
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2.5 text-sm text-(--prose)">
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
                  <span className="mt-0.5 block text-xs text-(--prose-3)">
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
              className="border-2 border-(--accent) bg-(--accent) px-3 py-2 text-sm font-semibold text-(--bg) disabled:opacity-50"
            >
              Save profile look
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-(--prose)">Cloud sync</h2>
            <p className="text-xs text-(--prose-3)">
              While signed in, every new roll is auto-pushed to the cloud
              (merge-safe). Manual pull/push still available for catch-up.
              Settings stay on this device unless you opt in below.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settingsSyncEnabled}
                disabled={busy || syncing}
                onChange={(e) => {
                  void (async () => {
                    const next = e.target.checked;
                    setBusy(true);
                    setMsg(null);
                    try {
                      if (!next) {
                        await patchMe({ settingsSyncEnabled: false });
                        setSettingsSyncEnabledFlag(false);
                        setMsg('Settings sync turned off. Cloud copy kept.');
                        return;
                      }
                      const { fetchCloudSave } =
                        await import('../../lib/sync-api');
                      // Enable gate first, then decide first-sync direction.
                      await patchMe({ settingsSyncEnabled: true });
                      setSettingsSyncEnabledFlag(true);
                      const { cloud } = await fetchCloudSave();
                      const hasCloudPrefs = Boolean(
                        cloud?.settings && cloud.settingsUpdatedAt,
                      );
                      if (!hasCloudPrefs) {
                        await syncToCloud();
                        setMsg('Settings sync on — this device uploaded.');
                        return;
                      }
                      const useCloud = await confirmAsync({
                        title: 'Cloud settings found',
                        body: 'This account already has synced settings. Use cloud prefs on this device, or keep this device and overwrite the cloud?',
                        confirmLabel: 'Use cloud',
                        cancelLabel: 'Keep this device',
                      });
                      if (useCloud) {
                        await pullFromCloud();
                        setMsg('Applied cloud settings to this device.');
                      } else {
                        await syncToCloud();
                        setMsg('Uploaded this device’s settings to the cloud.');
                      }
                    } catch (err) {
                      setMsg(
                        err instanceof Error
                          ? err.message
                          : 'Could not update settings sync',
                      );
                      // Revert optimistic UI if enable failed mid-flight
                      try {
                        const me = await fetchMe();
                        setSettingsSyncEnabledFlag(
                          Boolean(me.settingsSyncEnabled),
                        );
                      } catch {
                        /* ignore */
                      }
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              />
              Sync Settings across devices (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={syncing}
                className="border border-(--prose) px-3 py-2 text-xs font-bold uppercase"
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
                className="border-2 border-(--accent) bg-(--accent) px-3 py-2 text-xs font-bold uppercase text-(--bg)"
                onClick={() => {
                  log.info('push clicked');
                  void syncToCloud();
                }}
              >
                Push / merge to cloud
              </button>
            </div>
            {lastSyncAt && (
              <p className="text-xs text-(--prose-3)">
                Last sync: {new Date(lastSyncAt).toLocaleString()}
              </p>
            )}
            {syncError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {syncError}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-red-500/40 bg-(--surface) p-4">
            <h2 className="text-sm font-bold text-(--prose)">Delete account</h2>
            <p className="text-xs text-(--prose-3)">
              Permanently removes your cloud account, synced rolls, and related
              social data. Local browser saves are separate: clear site data if
              you want those gone too. We send a confirmation link to{' '}
              <span className="font-mono">{session.user.email}</span>.
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-(--prose-2)">
                Type DELETE to confirm
              </label>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                placeholder="DELETE"
                className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-(--prose-2)">
                Password (only if this account uses email + password)
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Optional"
                className="w-full border border-(--outline) bg-(--bg) px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRequestAccountDelete()}
              className="border border-red-600 px-3 py-2 text-xs font-bold uppercase text-red-700 disabled:opacity-50 dark:text-red-400"
            >
              Email me a delete confirmation
            </button>
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
              : 'text-(--prose-2)'
          }`}
        >
          {msg}
        </p>
      )}

      <p className="text-[10px] text-(--prose-3)">
        Debug: open console for <code>[rngdle:*]</code> logs ·{' '}
        <code>__rngdleLog.dump()</code> ·{' '}
        <code>__rngdleLog.setLevel(&apos;debug&apos;)</code>
      </p>
    </div>
  );
}
