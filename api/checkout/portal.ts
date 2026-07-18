import { eq } from 'drizzle-orm';
import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { userEntitlements } from '../../server/db/schema.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { createCustomerPortalUrl } from '../../server/polar/checkout.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/checkout/portal');

/**
 * POST /api/checkout/portal — Polar customer portal for Manage billing.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request, 'Sign in to manage billing');
  if (!gate.ok) return gate.response;
  const me = gate.user;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${me.id}:checkout-portal`,
    LIMITS.checkoutPerMinute,
    60_000,
  );
  if (limited) return limited;

  const [ent] = await db
    .select({
      polarCustomerId: userEntitlements.polarCustomerId,
      polarSubscriptionId: userEntitlements.polarSubscriptionId,
    })
    .from(userEntitlements)
    .where(eq(userEntitlements.userId, me.id))
    .limit(1);

  if (!ent?.polarCustomerId && !ent?.polarSubscriptionId) {
    return Response.json(
      {
        error:
          'No Polar billing account linked yet. Subscribe to Ranked Plus first, or you may have complimentary admin access.',
        code: 'no_polar_customer',
      },
      { status: 400 },
    );
  }

  const origin =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, '') ||
    process.env.VITE_APP_URL?.replace(/\/$/, '') ||
    requestUrl(request).origin;

  try {
    const url = await createCustomerPortalUrl({
      userId: me.id,
      polarCustomerId: ent.polarCustomerId,
      returnUrl: `${origin}/account`,
    });
    return Response.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('portal create failed', { userId: me.id, err: message });
    return Response.json(
      {
        error:
          'Could not open billing portal. If you have complimentary admin access without a Polar purchase, there may be nothing to manage.',
        code: 'portal_unavailable',
      },
      { status: 502 },
    );
  }
});
