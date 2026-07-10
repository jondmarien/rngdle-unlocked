import { rateGuard, readJson, requireUser } from '../../server/apiGuards.js';
import { processArcadeRoll } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { getUsername } from '../../server/rankedRoll.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/roll');

export const config = {
  maxDuration: 30,
};

/** POST /api/arcade/roll — optional body { useReroll?: boolean } */
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
    `user:${userId}:arcade-roll`,
    LIMITS.arcadeRollsPerHour,
    3_600_000,
    { error: 'Arcade roll rate limit — try again later' },
  );
  if (limited) return limited;

  const username = await getUsername(db, userId);
  if (!username) {
    return Response.json(
      { error: 'Username required', code: 'username_required' },
      { status: 400 },
    );
  }

  let useReroll = false;
  if (request.headers.get('content-type')?.includes('application/json')) {
    const parsed = await readJson<{ useReroll?: boolean }>(request);
    if (parsed.ok) useReroll = Boolean(parsed.body.useReroll);
  }

  try {
    const result = await processArcadeRoll(db, userId, { useReroll });
    if (!result.ok) return result.response;
    return Response.json({
      run: result.run,
      meta: result.meta,
      roll: result.roll,
      busted: result.busted,
      donResult: result.donResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('roll failed', { userId, err: message });
    return Response.json(
      { error: message || 'Arcade roll failed' },
      { status: 500 },
    );
  }
});
