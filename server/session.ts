import { createAuth } from './auth';

export async function getSessionUser(request: Request) {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
