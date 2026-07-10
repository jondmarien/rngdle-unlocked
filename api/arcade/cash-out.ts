import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { cashOutArcadeRun } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/cash-out');

/** POST /api/arcade/cash-out */
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
    const result = await cashOutArcadeRun(db, userId);
    if (!result.ok) return result.response;
    return Response.json({ run: result.run, meta: result.meta });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('cash-out failed', { userId, err: message });
    return Response.json(
      { error: message || 'Cash out failed' },
      { status: 500 },
    );
  }
});
