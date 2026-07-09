import { eq, ilike, or } from 'drizzle-orm';
import { requireAdmin } from '../../../server/admin.js';
import { user, userProgress } from '../../../server/db/schema.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

/**
 * GET /api/admin/users?q= — search by username or email (admin session).
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireAdmin(request);
  if (!gate.ok) return gate.response;
  const { db } = gate;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) {
    return Response.json(
      { error: 'q must be at least 2 characters' },
      { status: 400 },
    );
  }

  const pattern = `%${q.replace(/[%_]/g, '')}%`;
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
    .where(
      or(
        ilike(user.email, pattern),
        ilike(user.username, pattern),
        ilike(user.name, pattern),
        eq(user.id, q),
      ),
    )
    .limit(40);

  return Response.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      username: r.username,
      role: r.role,
      banned: r.banned,
      banReason: r.banReason,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      lifetimeEp: r.lifetimeEp ?? 0,
      lifetimeRollCount: r.lifetimeRollCount ?? 0,
    })),
  });
});
