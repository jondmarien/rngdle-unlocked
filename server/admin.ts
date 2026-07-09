import { eq } from 'drizzle-orm';
import { createAuth } from './auth.js';
import { createDb } from './db/index.js';
import { adminAuditLog, user } from './db/schema.js';
import { clientIp } from './rateLimit.js';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  username?: string | null;
  banned?: boolean | null;
};

export type RequireAdminOk = {
  ok: true;
  user: AdminUser;
  db: ReturnType<typeof createDb>;
  ip: string;
};

export type RequireAdminFail = {
  ok: false;
  response: Response;
};

function parseAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAdminRole(role: string | null | undefined, userId: string): boolean {
  if (role === 'admin') return true;
  return parseAdminIds().has(userId);
}

/**
 * Session cookie + role=admin (or ADMIN_USER_IDS bootstrap).
 * Never trusts a client-sent role field.
 */
export async function requireAdmin(
  request: Request,
): Promise<RequireAdminOk | RequireAdminFail> {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return {
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const db = createDb();
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      username: user.username,
      banned: user.banned,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!row) {
    return {
      ok: false,
      response: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (row.banned) {
    return {
      ok: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  if (!isAdminRole(row.role, row.id)) {
    return {
      ok: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: row,
    db,
    ip: clientIp(request),
  };
}

export async function writeAdminAudit(
  db: ReturnType<typeof createDb>,
  input: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    meta?: Record<string, unknown>;
    ip?: string | null;
  },
): Promise<void> {
  await db.insert(adminAuditLog).values({
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metaJson: JSON.stringify(input.meta ?? {}),
    ip: input.ip ?? null,
  });
}
