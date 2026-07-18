import { createLogger, withTimeout } from './logger';

const log = createLogger('me-api');
const FETCH_MS = 15_000;

export type LinkedAccount = {
  providerId: 'discord' | 'github';
  accountId: string;
  label: string;
};

export type MeUser = {
  name?: string | null;
  username?: string | null;
  usernameChangedAt?: string | null;
  usernameNextChangeAt?: string | null;
  profileAccent?: string;
  profileBio?: string;
  profileFlair?: string;
  profileAvatar?: string;
  profileFrame?: string;
  profileShowCodex?: boolean;
  rankedTier?: 'free' | 'rare' | 'epic' | 'anomaly';
  /** True when Polar customer/subscription is linked (Manage billing). */
  hasPolarBilling?: boolean;
};

export type MePayload = {
  user?: MeUser | null;
  linkedAccounts?: LinkedAccount[];
  settingsSyncEnabled?: boolean;
};

export type MePatch = {
  name?: string;
  username?: string;
  profileAccent?: string;
  profileBio?: string;
  profileFlair?: string;
  profileAvatar?: string;
  profileFrame?: string;
  profileShowCodex?: boolean;
  settingsSyncEnabled?: boolean;
};

/** GET /api/me — vanity fields, username, linked OAuth providers. */
export async function fetchMe(): Promise<MePayload> {
  const res = await fetch('/api/me', { credentials: 'include' });
  return (await res.json()) as MePayload;
}

/** PATCH /api/me — throws with the server's error message on failure. */
export async function patchMe(patch: MePatch): Promise<{
  name?: string;
  username?: string;
  usernameNextChangeAt?: string | null;
  settingsSyncEnabled?: boolean;
}> {
  const res = await withTimeout(
    fetch('/api/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
    FETCH_MS,
    'PATCH /api/me',
  );
  const data = (await res.json()) as {
    error?: string;
    name?: string;
    username?: string;
    usernameNextChangeAt?: string | null;
    settingsSyncEnabled?: boolean;
  };
  if (!res.ok) {
    log.warn('patch failed', { status: res.status, error: data.error });
    throw new Error(data.error ?? 'Failed');
  }
  return data;
}
