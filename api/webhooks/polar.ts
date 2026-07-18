import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { handlePolarWebhook } from '../../server/polar/webhooks.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/webhooks/polar');

/** Allow cold path for signature verify + entitlement upsert. */
export const config = {
  maxDuration: 30,
};

/**
 * POST /api/webhooks/polar
 * Public Polar webhook endpoint — signature verified via POLAR_WEBHOOK_SECRET.
 * No session auth. Idempotent on webhook-id.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    return await handlePolarWebhook(db, request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('webhook handler failed', { err: message });
    return Response.json({ error: 'Webhook failed' }, { status: 500 });
  }
});
