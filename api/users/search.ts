import { and, ilike, isNotNull, ne, sql } from 'drizzle-orm';
import { createAuth } from '../../server/auth.js';
import { createDb } from '../../server/db/index.js';
import { user } from '../../server/db/schema.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/users/search');

/** Public username search for follow / find-friends. */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const db = createDb();
  const ip = clientIp(request);
  const rl = await checkRateLimit(
    db,
    `ip:${ip}:users-search`,
    LIMITS.usersSearchPerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  const url = requestUrl(request);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) {
    return Response.json({
      users: [],
      message: 'Type at least 2 characters',
    });
  }
  if (!/^[a-z0-9_]{1,24}$/.test(q.replace(/%/g, ''))) {
    // allow partial; strip unsafe for like
  }
  const safe = q.replace(/[%_\\]/g, '');
  if (safe.length < 2) {
    return Response.json({ users: [] });
  }

  let excludeId: string | null = null;
  try {
    const auth = createAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    excludeId = session?.user?.id ?? null;
  } catch {
    /* ignore */
  }

  const pattern = `%${safe}%`;
  const rows = await db
    .select({
      username: user.username,
      name: user.name,
    })
    .from(user)
    .where(
      and(
        isNotNull(user.username),
        ilike(user.username, pattern),
        excludeId ? ne(user.id, excludeId) : sql`true`,
      ),
    )
    .limit(20);

  log.info('search', { q: safe, count: rows.length });
  return Response.json({
    users: rows
      .filter((r) => r.username)
      .map((r) => ({
        username: r.username!,
        name: r.name,
      })),
  });
});
