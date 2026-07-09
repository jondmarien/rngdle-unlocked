import { createAuth } from './auth.js';
import type { ApiRequest } from './http.js';

export async function getSessionUser(request: ApiRequest) {
  const auth = createAuth();
  const session = await auth.api.getSession({
    headers: request.headers as never,
  });
  return session?.user ?? null;
}
