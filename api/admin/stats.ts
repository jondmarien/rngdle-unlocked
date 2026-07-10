import { requireAdmin } from '../../server/admin.js';
import { getAdminStats } from '../../server/adminStats.js';
import { rateGuard } from '../../server/apiGuards.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/admin/stats');

/**
 * GET — lightweight COUNT snapshot for the admin metrics strip.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db, user: adminUser } = gate;

  const limited = await rateGuard(
    db,
    `user:${adminUser.id}:admin-stats`,
    LIMITS.adminMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  const stats = await getAdminStats(db);
  log.debug('stats', stats);
  return Response.json(stats);
});
