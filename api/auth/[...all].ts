import { createAuth } from '../../server/auth.js';
import type { ApiRequest } from '../../server/http.js';

/**
 * Better Auth catch-all — handles /api/auth/*
 */
export default async function handler(request: ApiRequest): Promise<Response> {
  try {
    const missing = ['DATABASE_URL', 'BETTER_AUTH_SECRET'].filter(
      (k) => !process.env[k],
    );
    if (missing.length > 0) {
      console.error('[api/auth] missing env', missing);
      return Response.json(
        { error: `Server misconfigured: missing ${missing.join(', ')}` },
        { status: 500 },
      );
    }

    const auth = createAuth();
    // Runtime value is a real Fetch Request from Vercel; cast for better-auth.
    return await auth.handler(request as unknown as Request);
  } catch (err) {
    console.error('[api/auth]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Auth error' },
      { status: 500 },
    );
  }
}
