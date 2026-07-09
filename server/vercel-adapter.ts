import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from './logger.js';

const log = createLogger('vercel-adapter');

export type NodeReq = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

/**
 * Vercel Node runtime calls default exports as (req, res) => void.
 * Our app logic uses Web Fetch Request/Response — convert at the boundary.
 */
export type WebHandler = (request: Request) => Promise<Response> | Response;

export function defineHandler(handler: WebHandler) {
  return async function nodeHandler(
    req: NodeReq,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const webReq = await toWebRequest(req);
      log.debug('dispatch', {
        method: webReq.method,
        url: webReq.url,
      });
      const webRes = await handler(webReq);
      await sendWebResponse(res, webRes);
    } catch (err) {
      log.error('unhandled', {
        err: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: err instanceof Error ? err.message : 'Server error',
          }),
        );
      }
    }
  };
}

/** Build an absolute Fetch Request from Node IncomingMessage. */
export async function toWebRequest(req: NodeReq): Promise<Request> {
  const protoHeader = headerValue(req.headers['x-forwarded-proto']);
  const proto = (protoHeader?.split(',')[0]?.trim() || 'https').replace(
    /:$/,
    '',
  );
  const host =
    headerValue(req.headers['x-forwarded-host']) ||
    headerValue(req.headers.host) ||
    'localhost';

  // Node IncomingMessage.url is a path only (e.g. /api/auth/sign-up/email).
  // better-auth/better-call requires an absolute URL for `new URL(request.url)`.
  let pathAndQuery = req.url || '/';
  if (!pathAndQuery.startsWith('/')) {
    pathAndQuery = `/${pathAndQuery}`;
  }

  // vercel.json rewrites /api/auth/* → /api/auth?__path=sign-up/email
  // Expand that back so better-auth sees the real route.
  try {
    const tmp = new URL(pathAndQuery, 'http://placeholder.local');
    const ba = tmp.searchParams.get('__path');
    if (
      ba != null &&
      (tmp.pathname === '/api/auth' || tmp.pathname === '/api/auth/')
    ) {
      const sub = ba.replace(/^\/+/, '');
      tmp.pathname = sub ? `/api/auth/${sub}` : '/api/auth';
      tmp.searchParams.delete('__path');
      pathAndQuery = `${tmp.pathname}${tmp.search}`;
    }
  } catch {
    /* keep original */
  }

  const absoluteUrl = `${proto}://${host}${pathAndQuery}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const method = (req.method || 'GET').toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    const buf = await readBody(req);
    if (buf && buf.length > 0) {
      // BodyInit accepts Uint8Array; Node Buffer is a subclass but TS 7 is strict
      init.body = new Uint8Array(buf);
    }
  }

  return new Request(absoluteUrl, init);
}

export async function sendWebResponse(
  res: ServerResponse,
  webRes: Response,
): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    // Node is picky about certain hop-by-hop headers
    if (key.toLowerCase() === 'transfer-encoding') return;
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  // @vercel/node often pre-parses JSON onto req.body and drains the stream.
  const anyReq = req as NodeReq & { rawBody?: Buffer | string };
  if (anyReq.rawBody !== undefined && anyReq.rawBody !== null) {
    if (Buffer.isBuffer(anyReq.rawBody)) return anyReq.rawBody;
    return Buffer.from(String(anyReq.rawBody));
  }
  if (anyReq.body !== undefined && anyReq.body !== null) {
    if (Buffer.isBuffer(anyReq.body)) return anyReq.body;
    if (typeof anyReq.body === 'string') {
      // Already a JSON string (or form string)
      return Buffer.from(anyReq.body);
    }
    // Parsed object — re-serialize for Fetch Request consumers (better-auth)
    return Buffer.from(JSON.stringify(anyReq.body));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
