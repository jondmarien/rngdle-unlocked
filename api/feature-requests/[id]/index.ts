import { isAdminRole } from '../../../server/admin.js';
import { rateGuard, readJson, requireUser } from '../../../server/apiGuards.js';
import { createDb } from '../../../server/db/index.js';
import { updateFeatureRequest } from '../../../server/featureRequests.js';
import { requestUrl } from '../../../server/http.js';
import { createLogger } from '../../../server/logger.js';
import { LIMITS } from '../../../server/rateLimit.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const log = createLogger('api/feature-requests/[id]');

/**
 * PATCH — author or admin edits title / description / tag (not status).
 */
export default defineHandler(async (request) => {
  if (request.method !== 'PATCH') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${me.id}:feature-edit`,
    LIMITS.featureRequestSubmitPerHour,
    60 * 60 * 1000,
  );
  if (limited) return limited;

  const url = requestUrl(request);
  const parts = url.pathname.split('/').filter(Boolean);
  const idIdx = parts.indexOf('feature-requests');
  const id =
    idIdx >= 0 ? decodeURIComponent(parts[idIdx + 1] ?? '') : '';
  if (!id || id === 'vote') {
    return Response.json({ error: 'Missing id' }, { status: 400 });
  }

  const parsed = await readJson<{
    title?: string;
    description?: string;
    tag?: string | null;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const result = await updateFeatureRequest(db, {
    requestId: id,
    actorUserId: me.id,
    isAdmin: isAdminRole(me.role, me.id),
    title: parsed.body.title,
    description: parsed.body.description,
    tag:
      parsed.body.tag === undefined
        ? undefined
        : parsed.body.tag === null || parsed.body.tag === ''
          ? null
          : (parsed.body.tag as
              | 'bug_fix'
              | 'new_feature'
              | 'change'
              | 'badge_update'),
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.status },
    );
  }

  log.info('patched', { id, userId: me.id });
  return Response.json({ item: result.item });
});
