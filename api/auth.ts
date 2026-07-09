import { createAuth } from '../server/auth.js';
import { createLogger } from '../server/logger.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/auth');

/**
 * Better Auth mount for all /api/auth/* routes.
 *
 * Nested paths are rewritten by vercel.json to /api/auth?__path=… and expanded
 * back to a full pathname in vercel-adapter (absolute URL for better-call).
 */
export default defineHandler(async (request) => {
  const started = Date.now();
  let pathname = '/api/auth';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    /* ignore */
  }
  log.info('request', {
    method: request.method,
    pathname,
    url: request.url,
  });

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

  try {
    const auth = createAuth();
    const res = await auth.handler(request);
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
});
