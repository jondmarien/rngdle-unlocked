import { createLogger, withTimeout } from './logger';
import type { RankedTier } from './ranked-limits';
import type { TopupSku } from './ranked-topups';

const log = createLogger('checkout-api');
const FETCH_MS = 20_000;

export type PaidRankedTier = Exclude<RankedTier, 'free'>;
export type { TopupSku };

export type CheckoutCreateBody = {
  tier: PaidRankedTier;
  discountCode?: string;
};

/** POST /api/checkout — returns Polar hosted checkout URL. */
export async function createCheckout(
  body: CheckoutCreateBody,
): Promise<{ url: string; checkoutId?: string }> {
  const res = await withTimeout(
    fetch('/api/checkout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    FETCH_MS,
    'POST /api/checkout',
  );
  const data = (await res.json()) as {
    url?: string;
    checkoutId?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !data.url) {
    log.warn('checkout create failed', {
      status: res.status,
      error: data.error,
      code: data.code,
    });
    throw new Error(data.error ?? 'Could not start checkout');
  }
  return { url: data.url, checkoutId: data.checkoutId };
}

/** POST /api/checkout/topup — Polar hosted checkout for Boost/Overload. */
export async function createTopupCheckout(body: {
  sku: TopupSku;
}): Promise<{ url: string; checkoutId?: string }> {
  const res = await withTimeout(
    fetch('/api/checkout/topup', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    FETCH_MS,
    'POST /api/checkout/topup',
  );
  const data = (await res.json()) as {
    url?: string;
    checkoutId?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !data.url) {
    log.warn('topup checkout failed', {
      status: res.status,
      error: data.error,
      code: data.code,
    });
    throw new Error(data.error ?? 'Could not start top-up checkout');
  }
  return { url: data.url, checkoutId: data.checkoutId };
}

/** POST /api/checkout/portal — Polar customer portal URL. */
export async function openBillingPortal(): Promise<{ url: string }> {
  const res = await withTimeout(
    fetch('/api/checkout/portal', {
      method: 'POST',
      credentials: 'include',
    }),
    FETCH_MS,
    'POST /api/checkout/portal',
  );
  const data = (await res.json()) as {
    url?: string;
    error?: string;
    code?: string;
  };
  if (!res.ok || !data.url) {
    log.warn('portal failed', {
      status: res.status,
      error: data.error,
      code: data.code,
    });
    throw new Error(data.error ?? 'Could not open billing portal');
  }
  return { url: data.url };
}
