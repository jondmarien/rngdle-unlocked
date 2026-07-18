/**
 * Polar → local Ranked entitlement sync.
 * Effective hourly cap = tier cap (+ phase-2 hour-scoped top-up; not yet wired).
 */

import { and, eq } from 'drizzle-orm';
import {
  HIGHEST_RANKED_TIER,
  RANKED_ROLLS_PER_HOUR,
  RANKED_TIER_CAPS,
  isRankedTier,
  type RankedTier,
  rankedCapForTier,
} from '../../src/lib/ranked-limits.js';
import { isAdminRole } from '../admin.js';
import type { Db } from '../db/index.js';
import { rankedTopups, user, userEntitlements } from '../db/schema.js';
import { createLogger } from '../logger.js';
import { startOfUtcHourMs } from '../rateLimit.js';

const log = createLogger('polar/entitlements');

/** Soft past_due grace before forcing free (ms). */
export const PAST_DUE_GRACE_MS = 72 * 60 * 60 * 1000;

export type EntitlementRow = {
  userId: string;
  polarCustomerId: string | null;
  tier: RankedTier;
  rankedRollsPerHour: number;
  subscriptionStatus: string | null;
  polarSubscriptionId: string | null;
  polarProductId: string | null;
  currentPeriodEnd: Date | null;
  pastDueSince: Date | null;
};

function parseTierFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): RankedTier | null {
  if (!metadata) return null;
  const raw = metadata.tier;
  if (typeof raw === 'string' && isRankedTier(raw) && raw !== 'free') {
    return raw;
  }
  const capRaw = metadata.ranked_rolls_per_hour;
  const cap =
    typeof capRaw === 'number'
      ? capRaw
      : typeof capRaw === 'string'
        ? Number.parseInt(capRaw, 10)
        : NaN;
  if (cap === RANKED_TIER_CAPS.rare) return 'rare';
  if (cap === RANKED_TIER_CAPS.epic) return 'epic';
  if (cap === RANKED_TIER_CAPS.anomaly) return 'anomaly';
  return null;
}

export function tierFromProductMetadata(
  metadata: Record<string, unknown> | null | undefined,
): RankedTier {
  return parseTierFromMetadata(metadata) ?? 'free';
}

/** Active-like Polar statuses that keep paid tier. */
function statusGrantsPaidAccess(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export async function getEntitlementRow(
  db: Db,
  userId: string,
): Promise<EntitlementRow | null> {
  const [row] = await db
    .select()
    .from(userEntitlements)
    .where(eq(userEntitlements.userId, userId))
    .limit(1);
  if (!row) return null;
  const tier: RankedTier = isRankedTier(row.tier) ? row.tier : 'free';
  return {
    userId: row.userId,
    polarCustomerId: row.polarCustomerId,
    tier,
    rankedRollsPerHour: row.rankedRollsPerHour,
    subscriptionStatus: row.subscriptionStatus,
    polarSubscriptionId: row.polarSubscriptionId,
    polarProductId: row.polarProductId,
    currentPeriodEnd: row.currentPeriodEnd,
    pastDueSince: row.pastDueSince,
  };
}

/**
 * Effective paid Ranked tier after status / past_due grace (ignores top-ups).
 * Admins (`role=admin` or `ADMIN_USER_IDS`) always receive the highest tier
 * (Anomaly) so cosmetics + Ranked hour cap match a full Ranked Plus sub.
 */
export async function getEffectiveRankedTier(
  db: Db,
  userId: string,
): Promise<RankedTier> {
  const [adminRow] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (adminRow && isAdminRole(adminRow.role, userId)) {
    return HIGHEST_RANKED_TIER;
  }

  const row = await getEntitlementRow(db, userId);
  if (!row) return 'free';
  const status = row.subscriptionStatus;
  if (status === 'past_due' && row.pastDueSince) {
    const elapsed = Date.now() - row.pastDueSince.getTime();
    if (elapsed > PAST_DUE_GRACE_MS) return 'free';
    return row.tier !== 'free' ? row.tier : 'free';
  }
  if (statusGrantsPaidAccess(status) && row.tier !== 'free') {
    return row.tier;
  }
  return 'free';
}

/**
 * Resolve Ranked hourly limit for a user (tier only; top-ups phase 2).
 * Applies past_due grace: after PAST_DUE_GRACE_MS, treat as free.
 */
export async function getEffectiveRankedLimit(
  db: Db,
  userId: string,
): Promise<number> {
  const tier = await getEffectiveRankedTier(db, userId);
  const tierCap = rankedCapForTier(tier);
  const topupBonus = await topupBonusForCurrentUtcHour(db, userId);
  return tierCap + topupBonus;
}

async function topupBonusForCurrentUtcHour(
  db: Db,
  userId: string,
): Promise<number> {
  const hourStart = new Date(startOfUtcHourMs(Date.now()));
  const rows = await db
    .select({
      bonus: rankedTopups.bonusRolls,
      overload: rankedTopups.isOverload,
    })
    .from(rankedTopups)
    .where(
      and(
        eq(rankedTopups.userId, userId),
        eq(rankedTopups.utcHourStart, hourStart),
      ),
    );
  if (rows.length === 0) return 0;
  let bonus = 0;
  for (const r of rows) {
    bonus += r.bonus ?? 0;
  }
  return bonus;
}

export async function linkPolarCustomer(
  db: Db,
  opts: {
    userId: string;
    polarCustomerId: string;
  },
): Promise<void> {
  const now = new Date();
  await db
    .insert(userEntitlements)
    .values({
      userId: opts.userId,
      polarCustomerId: opts.polarCustomerId,
      tier: 'free',
      rankedRollsPerHour: RANKED_ROLLS_PER_HOUR,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userEntitlements.userId,
      set: {
        polarCustomerId: opts.polarCustomerId,
        updatedAt: now,
      },
    });
}

export async function findUserIdByPolarCustomer(
  db: Db,
  polarCustomerId: string,
): Promise<string | null> {
  const [byEnt] = await db
    .select({ userId: userEntitlements.userId })
    .from(userEntitlements)
    .where(eq(userEntitlements.polarCustomerId, polarCustomerId))
    .limit(1);
  return byEnt?.userId ?? null;
}

export type UpsertSubscriptionEntitlementInput = {
  userId: string;
  polarCustomerId: string;
  polarSubscriptionId: string;
  polarProductId: string | null;
  productMetadata: Record<string, unknown> | null | undefined;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
};

/**
 * Idempotent upsert from subscription.* / paid order events.
 * Always writes the latest known Polar state for that user.
 */
export async function upsertSubscriptionEntitlement(
  db: Db,
  input: UpsertSubscriptionEntitlementInput,
): Promise<void> {
  const status = input.subscriptionStatus;
  const revoke =
    status === 'revoked' ||
    status === 'canceled' ||
    status === 'incomplete_expired' ||
    status === 'unpaid';

  let tier: RankedTier = 'free';
  let rankedRollsPerHour = RANKED_ROLLS_PER_HOUR;
  let pastDueSince: Date | null = null;

  if (!revoke && statusGrantsPaidAccess(status)) {
    tier = tierFromProductMetadata(input.productMetadata);
    if (tier === 'free') {
      log.warn('paid subscription without tier metadata — leaving free cap', {
        userId: input.userId,
        productId: input.polarProductId,
        status,
      });
    } else {
      rankedRollsPerHour = rankedCapForTier(tier);
    }
    if (status === 'past_due') {
      const existing = await getEntitlementRow(db, input.userId);
      pastDueSince = existing?.pastDueSince ?? new Date();
    }
  }

  const now = new Date();
  await db
    .insert(userEntitlements)
    .values({
      userId: input.userId,
      polarCustomerId: input.polarCustomerId,
      tier,
      rankedRollsPerHour,
      subscriptionStatus: status,
      polarSubscriptionId: input.polarSubscriptionId,
      polarProductId: input.polarProductId,
      currentPeriodEnd: input.currentPeriodEnd,
      pastDueSince,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userEntitlements.userId,
      set: {
        polarCustomerId: input.polarCustomerId,
        tier,
        rankedRollsPerHour,
        subscriptionStatus: status,
        polarSubscriptionId: input.polarSubscriptionId,
        polarProductId: input.polarProductId,
        currentPeriodEnd: input.currentPeriodEnd,
        pastDueSince,
        updatedAt: now,
      },
    });

  log.info('entitlement upsert', {
    userId: input.userId,
    tier,
    rankedRollsPerHour,
    status,
  });
}

/** Force free tier (refund / hard revoke). */
export async function revokeToFree(
  db: Db,
  userId: string,
  opts?: { polarCustomerId?: string | null },
): Promise<void> {
  const now = new Date();
  const existing = await getEntitlementRow(db, userId);
  await db
    .insert(userEntitlements)
    .values({
      userId,
      polarCustomerId:
        opts?.polarCustomerId ?? existing?.polarCustomerId ?? null,
      tier: 'free',
      rankedRollsPerHour: RANKED_ROLLS_PER_HOUR,
      subscriptionStatus: 'revoked',
      polarSubscriptionId: null,
      polarProductId: null,
      currentPeriodEnd: null,
      pastDueSince: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userEntitlements.userId,
      set: {
        tier: 'free',
        rankedRollsPerHour: RANKED_ROLLS_PER_HOUR,
        subscriptionStatus: 'revoked',
        polarSubscriptionId: null,
        polarProductId: null,
        currentPeriodEnd: null,
        pastDueSince: null,
        updatedAt: now,
        ...(opts?.polarCustomerId
          ? { polarCustomerId: opts.polarCustomerId }
          : {}),
      },
    });
  log.info('entitlement revoked to free', { userId });
}

/** Resolve app user id from Polar customer external_id or prior link. */
export async function resolveUserIdFromCustomer(
  db: Db,
  customer: {
    id: string;
    externalId?: string | null;
  },
): Promise<string | null> {
  if (customer.externalId) {
    return customer.externalId;
  }
  return findUserIdByPolarCustomer(db, customer.id);
}

/** No-op helper kept for future top-up grants (unique on source_order_id). */
export async function grantTopupIfNew(
  db: Db,
  opts: {
    id: string;
    userId: string;
    bonusRolls: number;
    isOverload: boolean;
    sourceOrderId: string;
  },
): Promise<boolean> {
  const hourStart = new Date(startOfUtcHourMs(Date.now()));
  try {
    await db.insert(rankedTopups).values({
      id: opts.id,
      userId: opts.userId,
      utcHourStart: hourStart,
      bonusRolls: opts.bonusRolls,
      isOverload: opts.isOverload,
      sourceOrderId: opts.sourceOrderId,
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return false;
    }
    throw err;
  }
}

/** Touch updated_at without changing tier (customer.updated noise). */
export async function touchEntitlementUpdated(
  db: Db,
  userId: string,
): Promise<void> {
  await db
    .update(userEntitlements)
    .set({ updatedAt: new Date() })
    .where(eq(userEntitlements.userId, userId));
}
