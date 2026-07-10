import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { getArcadeState } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { getUsername } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade');

/**
 * GET /api/arcade — meta + active run (auth + username for play; meta ok with auth).
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request, 'Sign in to play Arcade Mode');
  if (!gate.ok) return gate.response;
  const userId = gate.user.id;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${userId}:arcade-get`,
    LIMITS.arcadeMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  try {
    const username = await getUsername(db, userId);
    const state = await getArcadeState(db, userId);
    return Response.json({
      ...state,
      usernameRequired: !username,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('get failed', { userId, err: message });
    return Response.json(
      { error: message || 'Arcade state failed' },
      { status: 500 },
    );
  }
});
