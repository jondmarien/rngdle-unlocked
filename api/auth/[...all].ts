import { createAuth } from '../../server/auth.js';
import type { ApiRequest } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';

const log = createLogger('api/auth');

/**
 * Better Auth catch-all — handles /api/auth/*
 */
export default async function handler(request: ApiRequest): Promise<Response> {
  const started = Date.now();
  let pathname = '/api/auth';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    /* ignore */
  }
  log.info('request', { method: request.method, pathname });

  try {
    const missing = ['DATABASE_URL', 'BETTER_AUTH_SECRET'].filter(
      (k) => !process.env[k],
    );
    if (missing.length > 0) {
      log.error('missing env', { missing });
      return Response.json(
        { error: `Server misconfigured: missing ${missing.join(', ')}` },
        { status: 500 },
      );
    }

    const auth = createAuth();
    // Runtime value is a real Fetch Request from Vercel; cast for better-auth.
    const res = await auth.handler(request as unknown as Request);
    log.info('response', {
      pathname,
      status: res.status,
      ms: Date.now() - started,
    });
    return res;
  } catch (err) {
    log.error('handler threw', {
      pathname,
      ms: Date.now() - started,
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Auth error' },
      { status: 500 },
    );
  }
}
