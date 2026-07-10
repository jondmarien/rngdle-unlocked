import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { startArcadeRun } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { getUsername } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/start');

/** POST /api/arcade/start */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request, 'Sign in to play Arcade Mode');
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

  const username = await getUsername(db, userId);
  if (!username) {
    return Response.json(
      {
        error:
          'Claim a public @username on Account before Arcade Mode (required for the board).',
        code: 'username_required',
      },
      { status: 400 },
    );
  }

  try {
    const result = await startArcadeRun(db, userId);
    if (!result.ok) {
      return Response.json(
        {
          error: result.message,
          code: result.code,
          run: result.run,
        },
        { status: 409 },
      );
    }
    return Response.json(
      { run: result.run, meta: result.meta },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('start failed', { userId, err: message });
    return Response.json({ error: message || 'Start failed' }, { status: 500 });
  }
});
