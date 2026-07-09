import type { BadgeHit, RarityTier, RollResult } from '../game/types';
import { createLogger } from './logger';

const log = createLogger('roll-api');

export type RankedRollResponse =
  | { ok: true; roll: RollResult }
  | { ok: false; status: number; error?: string; body?: unknown };

/** POST /api/ranked-roll — server CSPRNG roll (auth + username required). */
export async function requestRankedRoll(): Promise<RankedRollResponse> {
  const res = await fetch('/api/ranked-roll', {
    method: 'POST',
    credentials: 'include',
  });
  const body = (await res.json().catch(() => ({}))) as {
    roll?: RollResult;
    error?: string;
    code?: string;
  };
  if (!res.ok || !body.roll) {
    return { ok: false, status: res.status, error: body.error, body };
  }
  return { ok: true, roll: body.roll };
}

export type AttestResponse =
  | { ok: true; seal: string }
  | { ok: false; status: number; error?: string };

/** POST /api/attest — optional HMAC seal on a claimed roll. */
export async function requestAttestation(input: {
  id: string;
  number: number;
  totalEP: number;
  rolledAt: string;
  shortCode?: string | null;
}): Promise<AttestResponse> {
  const res = await fetch('/api/attest', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { error?: string; seal?: string };
  if (!res.ok || !data.seal) {
    return { ok: false, status: res.status, error: data.error };
  }
  return { ok: true, seal: data.seal };
}

export type PublicRollDto = {
  id: string;
  shortCode?: string | null;
  number: number;
  totalEP: number;
  rarity: RarityTier;
  percentile: number;
  badges: BadgeHit[];
  rolledAt: string;
  player: { username: string | null; name: string };
};

/** GET /api/rolls/:key — throws with the server error when missing. */
export async function fetchPublicRoll(
  key: string,
  userHint?: string,
): Promise<PublicRollDto> {
  const q = userHint ? `?user=${encodeURIComponent(userHint)}` : '';
  const res = await fetch(`/api/rolls/${encodeURIComponent(key)}${q}`);
  const data = (await res.json()) as { error?: string; roll?: PublicRollDto };
  if (!res.ok) throw new Error(data.error ?? 'Not found');
  if (!data.roll) throw new Error('Not found');
  return data.roll;
}

/** Cheap existence probe used by the share gate poll (never throws). */
export async function isRollPublished(key: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rolls/${encodeURIComponent(key)}`, {
      credentials: 'include',
    });
    return res.ok;
  } catch (e) {
    log.debug('publish probe failed', {
      err: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}
