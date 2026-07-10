import { requireAdmin, writeAdminAudit } from '../../server/admin.js';
import { rateGuard, readJson } from '../../server/apiGuards.js';
import {
  deleteFeatureRequest,
  setFeatureRequestStatus,
} from '../../server/featureRequests.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/admin/feature-requests');

/**
 * PATCH — admin sets feature request status.
 * Body: { id, status: submitted|under_review|planned|in_progress|shipped|declined }
 * DELETE — admin hard-deletes a request (spam). Body: { id }
 */
export default defineHandler(async (request) => {
  if (request.method !== 'PATCH' && request.method !== 'DELETE') {
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

  if (request.method === 'DELETE') {
    const parsed = await readJson<{ id?: string }>(request);
    if (!parsed.ok) return parsed.response;
    const id = parsed.body.id?.trim();
    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 });
    }
    const result = await deleteFeatureRequest(db, id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }
    await writeAdminAudit(db, {
      actorUserId: adminUser.id,
      action: 'feature_request_delete',
      targetType: 'feature_request',
      targetId: id,
      meta: {},
      ip,
    });
    log.info('deleted', { id, by: adminUser.id });
    return Response.json({ ok: true });
  }

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
