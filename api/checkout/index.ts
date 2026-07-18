import { rateGuard, readJson, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { createRankedCheckout } from '../../server/polar/checkout.js';
import { isPaidRankedTier } from '../../server/polar/products.js';
import { LIMITS } from '../../server/rateLimit.js';
import { getUsername } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/checkout');

/**
 * POST /api/checkout — create Polar Checkout Session for Ranked Plus.
 * Requires signed-in user + public @username.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(
    request,
    'Sign in to subscribe to Ranked Plus',
  );
  if (!gate.ok) return gate.response;
  const me = gate.user;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${me.id}:checkout`,
    LIMITS.checkoutPerMinute,
    60_000,
  );
  if (limited) return limited;

  const username = await getUsername(db, me.id);
  if (!username) {
    return Response.json(
      {
        error:
          'Claim a public @username on Account before Ranked Plus checkout.',
        code: 'username_required',
      },
      { status: 400 },
    );
  }

  const parsed = await readJson<{
    tier?: string;
    discountCode?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const tierRaw = (parsed.body.tier ?? '').trim().toLowerCase();
  if (!isPaidRankedTier(tierRaw)) {
    return Response.json(
      { error: 'Invalid tier. Use rare, epic, or anomaly.' },
      { status: 400 },
    );
  }

  const origin =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, '') ||
    process.env.VITE_APP_URL?.replace(/\/$/, '') ||
    requestUrl(request).origin;

  try {
    const { url, checkoutId } = await createRankedCheckout({
      userId: me.id,
      email: me.email,
      name: me.name ?? username,
      tier: tierRaw,
      origin,
      discountCode: parsed.body.discountCode,
    });
    return Response.json({ url, checkoutId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('checkout create failed', { userId: me.id, err: message });
    if (message.includes('POLAR_API_KEY')) {
      return Response.json(
        { error: 'Checkout is temporarily unavailable.' },
        { status: 503 },
      );
    }
    return Response.json(
      { error: 'Could not start checkout. Try again.' },
      { status: 502 },
    );
  }
});
