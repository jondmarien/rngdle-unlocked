import { requireAdmin, writeAdminAudit } from '../../server/admin.js';
import { rateGuard, readJson } from '../../server/apiGuards.js';
import { setFeatureRequestStatus } from '../../server/featureRequests.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/admin/feature-requests');

/**
 * PATCH — admin sets feature request status.
 * Body: { id, status: submitted|under_review|planned|in_progress|shipped|declined }
 */
export default defineHandler(async (request) => {
  if (request.method !== 'PATCH') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db, user: adminUser, ip } = gate;

  const limited = await rateGuard(
    db,
    `user:${adminUser.id}:admin-feature-req`,
    LIMITS.adminMutatePerMinute,
    60_000,
  );
  if (limited) return limited;

  const parsed = await readJson<{ id?: string; status?: string }>(request);
  if (!parsed.ok) return parsed.response;

  const id = parsed.body.id?.trim();
  const status = parsed.body.status?.trim();
  if (!id || !status) {
    return Response.json({ error: 'id and status required' }, { status: 400 });
  }

  const result = await setFeatureRequestStatus(db, {
    requestId: id,
    status,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  await writeAdminAudit(db, {
    actorUserId: adminUser.id,
    action: `feature_request_${result.status}`,
    targetType: 'feature_request',
    targetId: id,
    meta: { status: result.status },
    ip,
  });

  log.info('status update', { id, status: result.status, by: adminUser.id });
  return Response.json({ ok: true, status: result.status });
});
