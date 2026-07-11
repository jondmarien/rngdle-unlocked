import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import {
  listFeatureRequests,
  submitFeatureRequest,
  validateFeatureRequestBody,
  type FeatureRequestSort,
} from '../server/featureRequests.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import { LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/feature-requests');

/**
 * GET  — list feature requests (signed in). ?sort=top|newest&limit=
 * POST — submit { title, description }
 */
export default defineHandler(async (request) => {
  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;
  const db = createDb();

  if (request.method === 'GET') {
    const limited = await rateGuard(
      db,
      `user:${me.id}:feature-list`,
      LIMITS.featureRequestListPerMinute,
      60_000,
    );
    if (limited) return limited;

    const url = requestUrl(request);
    const sort: FeatureRequestSort =
      url.searchParams.get('sort') === 'newest' ? 'newest' : 'top';
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('limit') ?? 50) || 50),
    );

    const items = await listFeatureRequests(db, {
      sort,
      limit,
      meUserId: me.id,
    });
    return Response.json({ items, sort });
  }

  if (request.method === 'POST') {
    const limited = await rateGuard(
      db,
      `user:${me.id}:feature-submit`,
      LIMITS.featureRequestSubmitPerHour,
      60 * 60 * 1000,
    );
    if (limited) return limited;

    const parsed = await readJson<{
      title?: string;
      description?: string;
      tag?: string | null;
      imageUrl?: string | null;
    }>(request);
    if (!parsed.ok) return parsed.response;

    const validated = validateFeatureRequestBody(parsed.body);
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }

    const item = await submitFeatureRequest(db, {
      userId: me.id,
      title: validated.title,
      description: validated.description,
      tag: validated.tag,
      imageUrl: validated.imageUrl,
    });
    log.info('created', { id: item.id, userId: me.id });
    return Response.json({ item }, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
