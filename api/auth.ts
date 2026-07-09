import { createAuth } from '../server/auth.js';
import { asFetchRequest, type ApiRequest } from '../server/http.js';

/**
 * Better Auth handler for all /api/auth/* routes.
 * Nested paths are rewritten here via vercel.json (Vite has no Next-style catch-all).
 */
export default async function handler(request: ApiRequest): Promise<Response> {
  try {
    const auth = createAuth();
    return auth.handler(asFetchRequest(request));
  } catch (err) {
    console.error('[api/auth]', err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Auth error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
