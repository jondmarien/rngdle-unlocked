import { createAuth } from '../../server/auth';

/**
 * Better Auth catch-all on Vercel serverless (Web Request/Response).
 * Path: /api/auth/*
 */
export default async function handler(request: Request): Promise<Response> {
  try {
    const auth = createAuth();
    return auth.handler(request);
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
