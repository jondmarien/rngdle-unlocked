/**
 * Shared handler guards: auth preamble, JSON body parse, rate-limit gate.
 * Mirrors the `requireAdmin` gate shape from `server/admin.ts`.
 */

import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { createDb } from './db/index.js';
import { user as userTable } from './db/schema.js';
import {
  checkRateLimit,
  isRateLimited,
  rateLimitedResponse,
  type RateLimitBlocked,
  type RateLimitOk,
  type RateLimitResult,
} from './rateLimit.js';
import { getSessionUser } from './session.js';

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getSessionUser>>
>;

export type RequireUserOk = { ok: true; user: SessionUser };
export type RequireUserFail = { ok: false; response: Response };

export type RateCheckOk = { ok: true; result: RateLimitOk };
export type RateCheckFail = { ok: false; response: Response };
export type RateCheckResult = RateCheckOk | RateCheckFail;

/**
 * Session-or-401 preamble shared by authenticated handlers.
 * Also rejects banned accounts (403) — defense in depth when ban fallback
 * updates columns without revoking cookies, or a session outlives a ban.
 */
export async function requireUser(
  request: Request,
  error = 'Unauthorized',
): Promise<RequireUserOk | RequireUserFail> {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return {
      ok: false,
      response: Response.json({ error }, { status: 401 }),
    };
  }

  const db = createDb();
  const [row] = await db
    .select({
      banned: userTable.banned,
      banExpires: userTable.banExpires,
    })
    .from(userTable)
    .where(eq(userTable.id, sessionUser.id))
    .limit(1);

  if (row?.banned) {
    const expires = row.banExpires;
    const expired = expires != null && new Date(expires).getTime() < Date.now();
    if (!expired) {
      return {
        ok: false,
        response: Response.json({ error: 'Account banned' }, { status: 403 }),
      };
    }
  }

  return { ok: true, user: sessionUser };
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
  const checked = await rateCheck(db, key, limit, windowMs, options);
  return checked.ok ? null : checked.response;
}

/**
 * Like rateGuard, but returns the success RateLimitResult (incl. quota)
 * so handlers can attach remaining/reset metadata without a second peek.
 */
export async function rateCheck(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
  options?: RateGuardOptions,
): Promise<RateCheckResult> {
  const rl: RateLimitResult = await checkRateLimit(db, key, limit, windowMs);
  if (!isRateLimited(rl)) return { ok: true, result: rl };
  const error =
    typeof options?.error === 'function' ? options.error(rl) : options?.error;
  return {
    ok: false,
    response: rateLimitedResponse(
      rl,
      error,
      options?.withRetryAfterHeader ?? true,
    ),
  };
}
