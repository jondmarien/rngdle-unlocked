/**
 * Polar Checkout Sessions + customer portal for Ranked Plus.
 */

import { createLogger } from '../logger.js';
import { getPolarClient } from './client.js';
import {
  isPaidRankedTier,
  productIdForTier,
  type PaidRankedTier,
} from './products.js';
import {
  bonusRollsForSku,
  isOverloadSku,
  productIdForTopupSku,
  type TopupSku,
} from './topups.js';

const log = createLogger('polar/checkout');

export type CreateRankedCheckoutInput = {
  userId: string;
  email: string;
  name: string;
  tier: PaidRankedTier;
  /** Absolute site origin, e.g. https://rngdle-unlocked.chron0.tech */
  origin: string;
  discountCode?: string | null;
};

async function resolveDiscountId(
  code: string | null | undefined,
): Promise<string | null> {
  const trimmed = code?.trim();
  if (!trimmed) return null;
  const polar = getPolarClient();
  try {
    const page = await polar.discounts.list({
      query: trimmed,
      limit: 20,
    });
    for await (const batch of page) {
      const items = batch.result.items ?? [];
      for (const d of items) {
        if (
          typeof d.code === 'string' &&
          d.code.toLowerCase() === trimmed.toLowerCase()
        ) {
          return d.id;
        }
      }
    }
  } catch (err) {
    log.warn('discount lookup failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return null;
}

/**
 * Create a hosted Polar checkout URL for one Ranked Plus tier.
 */
export async function createRankedCheckout(
  input: CreateRankedCheckoutInput,
): Promise<{ url: string; checkoutId: string }> {
  if (!isPaidRankedTier(input.tier)) {
    throw new Error('Invalid tier');
  }
  const productId = productIdForTier(input.tier);
  const origin = input.origin.replace(/\/$/, '');
  const discountId = await resolveDiscountId(input.discountCode);
  const polar = getPolarClient();

  const checkout = await polar.checkouts.create({
    products: [productId],
    externalCustomerId: input.userId,
    customerEmail: input.email,
    customerName: input.name || undefined,
    successUrl: `${origin}/plus?checkout=success&tier=${input.tier}&checkout_id={CHECKOUT_ID}`,
    returnUrl: `${origin}/plus?checkout=cancel`,
    allowDiscountCodes: true,
    ...(discountId ? { discountId } : {}),
    metadata: {
      tier: input.tier,
      app_user_id: input.userId,
    },
  });

  if (!checkout.url) {
    throw new Error('Polar checkout did not return a URL');
  }

  log.info('checkout created', {
    userId: input.userId,
    tier: input.tier,
    checkoutId: checkout.id,
    hasDiscount: Boolean(discountId),
  });

  return { url: checkout.url, checkoutId: checkout.id };
}

/**
 * Create a hosted Polar checkout URL for a one-time Ranked hour top-up.
 */
export async function createTopupCheckout(input: {
  userId: string;
  email: string;
  name: string;
  sku: TopupSku;
  origin: string;
}): Promise<{ url: string; checkoutId: string }> {
  const productId = productIdForTopupSku(input.sku);
  const origin = input.origin.replace(/\/$/, '');
  const polar = getPolarClient();

  const checkout = await polar.checkouts.create({
    products: [productId],
    externalCustomerId: input.userId,
    customerEmail: input.email,
    customerName: input.name || undefined,
    successUrl: `${origin}/plus?checkout=topup_success&sku=${input.sku}&checkout_id={CHECKOUT_ID}`,
    returnUrl: `${origin}/plus?checkout=cancel`,
    allowDiscountCodes: false,
    metadata: {
      kind: 'topup',
      topup_sku: input.sku,
      bonus_rolls: String(bonusRollsForSku(input.sku)),
      is_overload: isOverloadSku(input.sku) ? 'true' : 'false',
      app_user_id: input.userId,
    },
  });

  if (!checkout.url) {
    throw new Error('Polar checkout did not return a URL');
  }

  log.info('topup checkout created', {
    userId: input.userId,
    sku: input.sku,
    checkoutId: checkout.id,
  });

  return { url: checkout.url, checkoutId: checkout.id };
}

/**
 * Hosted Polar customer portal (manage billing / cancel).
 * Prefer Polar customer id from entitlements; fall back to external id = Better Auth user id.
 */
export async function createCustomerPortalUrl(opts: {
  userId: string;
  polarCustomerId?: string | null;
  returnUrl: string;
}): Promise<string> {
  const polar = getPolarClient();
  const session = await polar.customerSessions.create({
    ...(opts.polarCustomerId
      ? { customerId: opts.polarCustomerId }
      : { externalCustomerId: opts.userId }),
    returnUrl: opts.returnUrl,
  });
  if (!session.customerPortalUrl) {
    throw new Error('Polar customer session did not return a portal URL');
  }
  return session.customerPortalUrl;
}
