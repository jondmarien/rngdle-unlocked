import { eq } from 'drizzle-orm';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { user } from '../server/db/schema.js';
import type { ApiRequest } from '../server/http.js';
import { createLogger } from '../server/logger.js';

const log = createLogger('api/me');

async function getSession(request: ApiRequest) {
  const auth = createAuth();
  // Runtime headers are a real Headers object; cast for better-auth's HeadersInit.
  return auth.api.getSession({ headers: request.headers as never });
}

export default async function handler(request: ApiRequest): Promise<Response> {
  try {
    log.info('request', { method: request.method });
    if (request.method === 'GET') {
      const session = await getSession(request);
      if (!session) {
        log.debug('no session');
        return Response.json({ user: null }, { status: 200 });
      }
      log.debug('session ok', { userId: session.user.id });
      return Response.json({ user: session.user, session: session.session });
    }

    if (request.method === 'PATCH') {
      const session = await getSession(request);
      if (!session?.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const body = (await request.json()) as { username?: string };
      const username = body.username?.trim().toLowerCase();
      log.info('username patch', { userId: session.user.id, username });
      if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
        return Response.json(
          { error: 'Username must be 3–24 chars: a-z, 0-9, _' },
          { status: 400 },
        );
      }
      const db = createDb();
      try {
        await db
          .update(user)
          .set({ username, updatedAt: new Date() })
          .where(eq(user.id, session.user.id));
      } catch {
        return Response.json(
          { error: 'Username taken or invalid' },
          { status: 409 },
        );
      }
      return Response.json({ ok: true, username });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
