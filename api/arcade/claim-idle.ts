import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { claimIdleDigits } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/claim-idle');

/** POST /api/arcade/claim-idle — server-computed idle Digits → bank */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const userId = gate.user.id;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${userId}:arcade-mutate`,
    LIMITS.arcadeMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  try {
    const result = await claimIdleDigits(db, userId);
    return Response.json({
      meta: result.meta,
      claimed: result.claimed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('claim-idle failed', { userId, err: message });
    return Response.json(
      { error: message || 'Claim idle failed' },
      { status: 500 },
    );
  }
});
