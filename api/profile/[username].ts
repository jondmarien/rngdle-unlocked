import { rateGuard } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { profileResponse } from '../../server/profile.js';
import { clientIp, LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/profile');

/** GET /api/profile/:username — payload assembly lives in server/profile.ts. */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    const ip = clientIp(request);
    const limited = await rateGuard(
      db,
      `ip:${ip}:profile`,
      LIMITS.profilePerMinute,
      60_000,
    );
    if (limited) return limited;

    return await profileResponse(db, request);
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
});
