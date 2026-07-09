import { createAuth } from './auth.js';

/** Resolve the Better Auth session user from request headers (null if signed out). */
export async function getSessionUser(request: Request) {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
