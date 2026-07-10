import type { BadgeHit, RarityTier, RollResult } from '../game/types';
import { createLogger } from './logger';
import {
  rankedQuotaResponseSchema,
  rankedQuotaSchema,
  type RankedQuota,
} from './schemas';

const log = createLogger('roll-api');

export type { RankedQuota };

export const RANKED_QUOTA_QUERY_KEY = ['ranked-quota'] as const;

export type RankedRollResponse =
  | { ok: true; roll: RollResult; quota?: RankedQuota }
  | {
      ok: false;
      status: number;
      error?: string;
      body?: unknown;
      quota?: RankedQuota;
    };

function parseQuota(raw: unknown): RankedQuota | undefined {
  const parsed = rankedQuotaSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

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
    quota?: unknown;
  };
  const quota = parseQuota(body.quota);
  if (!res.ok || !body.roll) {
    return { ok: false, status: res.status, error: body.error, body, quota };
  }
  return { ok: true, roll: body.roll, quota };
}

/**
 * GET /api/ranked-roll/quota — read-only remaining / reset.
 * Soft-fails (returns null) on any error including the soft burst 429 so the
 * UI never shows a second rate-limit message for this peek endpoint.
 */
export async function fetchRankedQuota(): Promise<RankedQuota | null> {
  try {
    const res = await fetch('/api/ranked-roll/quota', {
      credentials: 'include',
    });
    if (!res.ok) {
      log.debug('ranked quota soft-fail', { status: res.status });
      return null;
    }
    const json: unknown = await res.json().catch(() => null);
    const parsed = rankedQuotaResponseSchema.safeParse(json);
    if (!parsed.success) {
      log.debug('ranked quota parse failed');
      return null;
    }
    return parsed.data.quota;
  } catch (e) {
    log.debug('ranked quota fetch failed', {
      err: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/** Relative reset copy for the Ranked quota pill (honest fixed-window). */
export function formatRankedResetsIn(resetsInSec: number): string {
  if (resetsInSec < 60) return `resets in ${resetsInSec}s`;
  const minutes = Math.ceil(resetsInSec / 60);
  if (minutes < 60) return `resets in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `resets in ${hours}h` : `resets in ${hours}h ${rem}m`;
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
