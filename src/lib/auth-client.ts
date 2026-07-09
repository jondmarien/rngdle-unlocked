import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  basePath: '/api/auth',
});

export const { signIn, signUp, signOut, useSession } = authClient;
