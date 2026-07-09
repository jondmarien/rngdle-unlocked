import { createAuthClient } from 'better-auth/react';
import { createLogger } from './logger';

const log = createLogger('auth-client');

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  basePath: '/api/auth',
  fetchOptions: {
    onRequest(ctx) {
      log.debug('request', {
        url: String(ctx.url ?? ''),
        method: String(ctx.method ?? ''),
      });
    },
    onSuccess(ctx) {
      log.info('success', {
        url: String(ctx.response?.url ?? ctx.request?.url ?? ''),
        status: ctx.response?.status,
      });
    },
    onError(ctx) {
      log.error('error', {
        message: ctx.error?.message ?? String(ctx.error),
        status: ctx.response?.status,
      });
    },
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
