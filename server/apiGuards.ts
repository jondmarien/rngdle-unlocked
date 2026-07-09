/**
 * Shared handler guards: auth preamble, JSON body parse, rate-limit gate.
 * Mirrors the `requireAdmin` gate shape from `server/admin.ts`.
 */

import type { Db } from './db/index.js';
import {
  checkRateLimit,
  isRateLimited,
  rateLimitedResponse,
  type RateLimitBlocked,
} from './rateLimit.js';
import { getSessionUser } from './session.js';

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;

export type RequireUserOk = { ok: true; user: SessionUser };
export type RequireUserFail = { ok: false; response: Response };

/** Session-or-401 preamble shared by authenticated handlers. */
export async function requireUser(
  request: Request,
  error = 'Unauthorized',
): Promise<RequireUserOk | RequireUserFail> {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export type ReadJsonOk<T> = { ok: true; body: T };
export type ReadJsonFail = { ok: false; response: Response };

/** Parse the request body as JSON or produce the standard 400. */
export async function readJson<T>(
  request: Request,
  error = 'Invalid JSON',
): Promise<ReadJsonOk<T> | ReadJsonFail> {
  try {
    return { ok: true, body: (await request.json()) as T };
  } catch {
    return {
      ok: false,
      response: Response.json({ error }, { status: 400 }),
    };
  }
}

export type RateGuardOptions = {
  /** 429 body message; a function receives the blocked result for dynamic copy. */
  error?: string | ((rl: RateLimitBlocked) => string);
  /** Default true (the common `rateLimitedResponse(rl, 'Rate limited', true)` form). */
  withRetryAfterHeader?: boolean;
};

/** Returns a 429 Response when the window is exhausted, else null. */
export async function rateGuard(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
  options?: RateGuardOptions,
): Promise<Response | null> {
  const rl = await checkRateLimit(db, key, limit, windowMs);
  if (!isRateLimited(rl)) return null;
  const error =
    typeof options?.error === 'function' ? options.error(rl) : options?.error;
  return rateLimitedResponse(rl, error, options?.withRetryAfterHeader ?? true);
}
