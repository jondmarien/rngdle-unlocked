import { count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { requireAdmin } from '../../../server/admin.js';
import { rateGuard } from '../../../server/apiGuards.js';
import { user, userProgress } from '../../../server/db/schema.js';
import { LIMITS } from '../../../server/rateLimit.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * GET /api/admin/users?q=&page=1&limit=25
 * Lists users (newest first). Optional `q` filters email / username / name / id.
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
    `user:${adminUser.id}:admin-users`,
    LIMITS.usersSearchPerMinute,
    60_000,
  );
  if (limited) return limited;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const pageRaw = Number(url.searchParams.get('page') ?? '1');
  const limitRaw = Number(
    url.searchParams.get('limit') ?? String(DEFAULT_LIMIT),
  );
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.isFinite(limitRaw) ? Math.floor(limitRaw) : DEFAULT_LIMIT,
    ),
  );
  const offset = (page - 1) * limit;

  const safeQ = q.replace(/[%_]/g, '');
  const whereClause =
    q.length >= 1
      ? or(
          ilike(user.email, `%${safeQ}%`),
          ilike(user.username, `%${safeQ}%`),
          ilike(user.name, `%${safeQ}%`),
          eq(user.id, q),
        )
      : undefined;

  const [totalRow] = await db
    .select({ total: count() })
    .from(user)
    .where(whereClause);

  const total = Number(totalRow?.total ?? 0);

  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      lifetimeEp: userProgress.lifetimeEp,
      lifetimeRollCount: userProgress.lifetimeRollCount,
    })
    .from(user)
    .leftJoin(userProgress, eq(userProgress.userId, user.id))
    .where(whereClause)
    .orderBy(desc(user.createdAt), sql`${user.id} desc`)
    .limit(limit)
    .offset(offset);

  return Response.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      username: r.username,
      role: r.role,
      banned: Boolean(r.banned),
      banReason: r.banReason,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      lifetimeEp: r.lifetimeEp ?? 0,
      lifetimeRollCount: r.lifetimeRollCount ?? 0,
    })),
    total,
    page,
    limit,
  });
});
