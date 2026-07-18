/**
 * @username change cooldown + former-handle hold (anti-snipe).
 */

import { and, eq, gt, lte, ne } from 'drizzle-orm';
import type { createDb } from './db/index.js';
import { user, usernameHolds } from './db/schema.js';
import { normalizeUsername } from './username.js';

export const USERNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const USERNAME_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 48;

type Db = ReturnType<typeof createDb>;

/** Normalize + validate display name (duplicates allowed). */
export function normalizeDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
    return null;
  }
  return name;
}

/** Next allowed change instant, or null if change is allowed now. */
export function usernameNextChangeAt(
  changedAt: Date | null | undefined,
  now = new Date(),
): Date | null {
  if (!changedAt) return null;
  const next = new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS);
  return next.getTime() > now.getTime() ? next : null;
}

export function isUsernameChangeOnCooldown(
  changedAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return usernameNextChangeAt(changedAt, now) != null;
}

/**
 * Whether `candidate` is free for `claimantUserId`:
 * not another user's live username, and not held by someone else.
 */
export async function isUsernameAvailableFor(
  db: Db,
  candidateRaw: string,
  claimantUserId: string,
  now = new Date(),
): Promise<boolean> {
  const candidate = normalizeUsername(candidateRaw);
  if (!candidate) return false;

  await db
    .delete(usernameHolds)
    .where(
      and(
        eq(usernameHolds.username, candidate),
        lte(usernameHolds.expiresAt, now),
      ),
    );

  const [live] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.username, candidate), ne(user.id, claimantUserId)))
    .limit(1);
  if (live) return false;

  const [hold] = await db
    .select({ userId: usernameHolds.userId })
    .from(usernameHolds)
    .where(
      and(
        eq(usernameHolds.username, candidate),
        gt(usernameHolds.expiresAt, now),
      ),
    )
    .limit(1);
  if (hold && hold.userId !== claimantUserId) return false;

  return true;
}

/** Reserve previous handle for 7 days (upsert). */
export async function holdFormerUsername(
  db: Db,
  previousRaw: string,
  ownerUserId: string,
  now = new Date(),
): Promise<void> {
  const previous = normalizeUsername(previousRaw);
  if (!previous) return;
  const expiresAt = new Date(now.getTime() + USERNAME_HOLD_MS);
  await db
    .insert(usernameHolds)
    .values({
      username: previous,
      userId: ownerUserId,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: usernameHolds.username,
      set: { userId: ownerUserId, expiresAt },
    });
}
