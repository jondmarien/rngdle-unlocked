/**
 * Polar webhook verify + dispatch → entitlement upserts.
 */

import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { polarWebhookEvents } from '../db/schema.js';
import { createLogger } from '../logger.js';
import {
  getTopupHourState,
  grantTopupIfNew,
  linkPolarCustomer,
  resolveUserIdFromCustomer,
  revokeToFree,
  revokeTopupByOrderId,
  upsertSubscriptionEntitlement,
} from './entitlements.js';
import {
  assertTopupAllowed,
  bonusRollsForSku,
  isOverloadSku,
  topupSkuFromMetadata,
} from './topups.js';

const log = createLogger('polar/webhooks');

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function metaRecord(
  metadata: unknown,
): Record<string, unknown> | null | undefined {
  if (metadata == null) return metadata as null | undefined;
  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Claim webhook-id for idempotency.
 * @returns true if this delivery should be processed; false if already seen.
 */
export async function claimWebhookDelivery(
  db: Db,
  webhookId: string,
  type: string,
): Promise<boolean> {
  try {
    await db.insert(polarWebhookEvents).values({
      webhookId,
      type,
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('duplicate') ||
      msg.includes('unique') ||
      msg.includes('polar_webhook_events_pkey')
    ) {
      return false;
    }
    throw err;
  }
}

type SubscriptionLike = {
  id: string;
  status: string;
  productId?: string | null;
  customerId: string;
  currentPeriodEnd?: Date | string | null;
  customer: {
    id: string;
    externalId?: string | null;
  };
  product?: {
    id?: string;
    metadata?: Record<string, unknown> | null;
  } | null;
};

async function applySubscription(db: Db, sub: SubscriptionLike): Promise<void> {
  const userId = await resolveUserIdFromCustomer(db, sub.customer);
  if (!userId) {
    log.warn('subscription event without resolvable user', {
      polarCustomerId: sub.customer.id,
      subscriptionId: sub.id,
      externalId: sub.customer.externalId,
    });
    return;
  }

  await linkPolarCustomer(db, {
    userId,
    polarCustomerId: sub.customer.id,
  });

  await upsertSubscriptionEntitlement(db, {
    userId,
    polarCustomerId: sub.customer.id,
    polarSubscriptionId: sub.id,
    polarProductId: sub.productId ?? sub.product?.id ?? null,
    productMetadata: metaRecord(sub.product?.metadata),
    subscriptionStatus: sub.status,
    currentPeriodEnd: asDate(sub.currentPeriodEnd),
  });
}

async function applyCustomerLink(
  db: Db,
  customer: { id: string; externalId?: string | null },
): Promise<void> {
  const userId = await resolveUserIdFromCustomer(db, customer);
  if (!userId) {
    log.warn('customer event without resolvable user', {
      polarCustomerId: customer.id,
      externalId: customer.externalId,
    });
    return;
  }
  await linkPolarCustomer(db, {
    userId,
    polarCustomerId: customer.id,
  });
}

/**
 * Validate signature, idempotently process Polar webhook payload.
 * Returns a Response (202 accepted, 403 bad signature, 500 on hard failure).
 */
export async function handlePolarWebhook(
  db: Db,
  request: Request,
): Promise<Response> {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    log.error('POLAR_WEBHOOK_SECRET missing');
    return Response.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const headerRecord = headersToRecord(request.headers);
  const webhookId = headerRecord['webhook-id'] ?? headerRecord['Webhook-Id'];

  let event: { type: string; data: unknown };
  try {
    event = validateEvent(rawBody, headerRecord, secret) as {
      type: string;
      data: unknown;
    };
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      log.warn('signature verification failed');
      return new Response('', { status: 403 });
    }
    throw err;
  }

  if (!webhookId) {
    log.warn('missing webhook-id header');
    return Response.json({ error: 'Missing webhook-id' }, { status: 400 });
  }

  const claimed = await claimWebhookDelivery(db, webhookId, event.type);
  if (!claimed) {
    log.debug('duplicate delivery', { webhookId, type: event.type });
    return new Response('', { status: 202 });
  }

  try {
    await dispatchPolarEvent(db, event.type, event.data);
  } catch (err) {
    // Allow Polar retry: delete claim so redelivery can reprocess
    await db
      .delete(polarWebhookEvents)
      .where(eq(polarWebhookEvents.webhookId, webhookId));
    const message = err instanceof Error ? err.message : String(err);
    log.error('dispatch failed', { type: event.type, err: message });
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }

  return new Response('', { status: 202 });
}

async function dispatchPolarEvent(
  db: Db,
  type: string,
  data: unknown,
): Promise<void> {
  switch (type) {
    case 'customer.created':
    case 'customer.updated': {
      const customer = data as {
        id: string;
        externalId?: string | null;
      };
      await applyCustomerLink(db, customer);
      break;
    }
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.past_due':
    case 'subscription.canceled':
    case 'subscription.uncanceled':
    case 'subscription.revoked': {
      await applySubscription(db, data as SubscriptionLike);
      break;
    }
    case 'order.paid': {
      const order = data as {
        id: string;
        subscriptionId?: string | null;
        customerId: string;
        productId?: string | null;
        customer: { id: string; externalId?: string | null };
        product?: {
          id?: string;
          metadata?: Record<string, unknown> | null;
          isRecurring?: boolean;
        } | null;
        subscription?: SubscriptionLike | null;
      };
      await applyCustomerLink(db, order.customer);
      if (order.subscription) {
        await applySubscription(db, order.subscription);
      } else if (order.subscriptionId && order.product?.isRecurring) {
        // Subscription id present but nested sub missing — link customer only;
        // subscription.* events will complete the tier upsert.
        log.info('order.paid subscription without nested sub', {
          orderId: order.id,
          subscriptionId: order.subscriptionId,
        });
      } else if (!order.subscriptionId && !order.product?.isRecurring) {
        const userId = await resolveUserIdFromCustomer(db, order.customer);
        if (!userId) {
          log.warn('order.paid topup without user', { orderId: order.id });
          break;
        }
        const sku =
          topupSkuFromMetadata(order.product?.metadata ?? null) ??
          topupSkuFromMetadata(
            (order as { metadata?: Record<string, unknown> }).metadata ?? null,
          );
        if (!sku) {
          log.info('order.paid one-time without topup metadata', {
            orderId: order.id,
            productId: order.productId,
          });
          break;
        }
        const state = await getTopupHourState(db, userId);
        const allowed = assertTopupAllowed(state, sku);
        if (!allowed.ok) {
          log.warn('order.paid topup stacking rejected', {
            orderId: order.id,
            userId,
            sku,
            code: allowed.code,
          });
          break;
        }
        const granted = await grantTopupIfNew(db, {
          id: `topup_${order.id}`,
          userId,
          bonusRolls: bonusRollsForSku(sku),
          isOverload: isOverloadSku(sku),
          sourceOrderId: order.id,
        });
        log.info('order.paid topup grant', {
          orderId: order.id,
          userId,
          sku,
          granted,
        });
      }
      break;
    }
    case 'order.refunded': {
      const order = data as {
        id: string;
        subscriptionId?: string | null;
        customer: { id: string; externalId?: string | null };
        product?: {
          isRecurring?: boolean;
          metadata?: Record<string, unknown> | null;
        } | null;
        metadata?: Record<string, unknown> | null;
      };
      const userId = await resolveUserIdFromCustomer(db, order.customer);
      if (!userId) {
        log.warn('order.refunded without user', { orderId: order.id });
        break;
      }
      if (order.subscriptionId || order.product?.isRecurring) {
        await revokeToFree(db, userId, {
          polarCustomerId: order.customer.id,
        });
      } else {
        const revoked = await revokeTopupByOrderId(db, order.id);
        log.info('order.refunded topup revoke', {
          orderId: order.id,
          userId,
          revoked,
        });
      }
      break;
    }
    // Subscribed extras / noise — acknowledge without entitlement changes
    case 'checkout.created':
    case 'checkout.updated':
    case 'checkout.expired':
    case 'customer.deleted':
    case 'customer.state_changed':
    case 'order.created':
    case 'order.updated':
    case 'subscription.paused':
    case 'subscription.resumed':
    case 'refund.created':
    case 'refund.updated':
    case 'product.created':
    case 'product.updated':
    case 'benefit.created':
    case 'benefit.updated':
    case 'benefit_grant.created':
    case 'benefit_grant.cycled':
    case 'benefit_grant.updated':
    case 'benefit_grant.revoked':
    case 'organization.updated':
    case 'customer_seat.assigned':
    case 'customer_seat.claimed':
    case 'customer_seat.revoked':
    case 'member.created':
    case 'member.updated':
    case 'member.deleted':
      log.debug('ignored event type', { type });
      break;
    default: {
      const _exhaustive: string = type;
      log.info('unhandled event type', { type: _exhaustive });
      break;
    }
  }
}
