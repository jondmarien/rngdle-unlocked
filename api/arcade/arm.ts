import { rateGuard, readJson, requireUser } from '../../server/apiGuards.js';
import { armArcadeActive } from '../../server/arcade.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/arcade/arm');

/** POST /api/arcade/arm — { upgradeId } arm an owned active (DoN, lock, surge, bonus). */
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

  const parsed = await readJson<{ upgradeId?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const upgradeId = parsed.body.upgradeId;
  if (!upgradeId || typeof upgradeId !== 'string') {
    return Response.json({ error: 'upgradeId required' }, { status: 400 });
  }

  try {
    const result = await armArcadeActive(db, userId, upgradeId);
    if (!result.ok) return result.response;
    return Response.json({ run: result.run });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('arm failed', { userId, err: message });
    return Response.json({ error: message || 'Arm failed' }, { status: 500 });
  }
});
