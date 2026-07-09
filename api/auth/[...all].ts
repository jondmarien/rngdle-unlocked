import { createAuth } from '../../server/auth.js';
import { createLogger } from '../../server/logger.js';
import { requestUrl } from '../../server/http.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/auth');

/**
 * Better Auth catch-all — /api/auth/*
 * Must use Node (req,res) via defineHandler; Vercel does not pass Web Request.
 */
export default defineHandler(async (request) => {
  const started = Date.now();
  const url = requestUrl(request, '/api/auth');
  log.info('request', { method: request.method, url: url.href });

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
      pathname: url.pathname,
      status: res.status,
      ms: Date.now() - started,
    });
    return res;
  } catch (err) {
    log.error('handler threw', {
      pathname: url.pathname,
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
