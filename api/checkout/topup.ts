import { rateGuard, readJson, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { createTopupCheckout } from '../../server/polar/checkout.js';
import { getTopupHourState } from '../../server/polar/entitlements.js';
import { assertTopupAllowed, isTopupSku } from '../../server/polar/topups.js';
import { LIMITS } from '../../server/rateLimit.js';
import { getUsername } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/checkout/topup');

/**
 * POST /api/checkout/topup — Polar Checkout Session for Ranked hour Boost/Overload.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request, 'Sign in to buy a Ranked top-up');
  if (!gate.ok) return gate.response;
  const me = gate.user;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${me.id}:checkout-topup`,
    LIMITS.checkoutPerMinute,
    60_000,
  );
  if (limited) return limited;

  const username = await getUsername(db, me.id);
  if (!username) {
    return Response.json(
      {
        error:
          'Claim a public @username on Account before Ranked top-up checkout.',
        code: 'username_required',
      },
      { status: 400 },
    );
  }

  const parsed = await readJson<{ sku?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const skuRaw = (parsed.body.sku ?? '').trim().toLowerCase();
  if (!isTopupSku(skuRaw)) {
    return Response.json(
      { error: 'Invalid top-up. Use boost_30, boost_60, or overload.' },
      { status: 400 },
    );
  }

  const state = await getTopupHourState(db, me.id);
  const allowed = assertTopupAllowed(state, skuRaw);
  if (!allowed.ok) {
    return Response.json(
      { error: allowed.reason, code: allowed.code },
      { status: 400 },
    );
  }

  const origin =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, '') ||
    process.env.VITE_APP_URL?.replace(/\/$/, '') ||
    requestUrl(request).origin;

  try {
    const { url, checkoutId } = await createTopupCheckout({
      userId: me.id,
      email: me.email,
      name: me.name ?? username,
      sku: skuRaw,
      origin,
    });
    return Response.json({ url, checkoutId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('topup checkout create failed', { userId: me.id, err: message });
    if (message.includes('POLAR_API_KEY')) {
      return Response.json(
        { error: 'Checkout is temporarily unavailable.' },
        { status: 503 },
      );
    }
    return Response.json(
      { error: 'Could not start top-up checkout. Try again.' },
      { status: 502 },
    );
  }
});
