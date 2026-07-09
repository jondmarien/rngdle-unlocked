import { createAuthClient } from 'better-auth/react';
import {
  inferAdditionalFields,
  magicLinkClient,
} from 'better-auth/client/plugins';
import { createLogger } from './logger';

const log = createLogger('auth-client');

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  basePath: '/api/auth',
  plugins: [
    magicLinkClient(),
    // Mirrors server/auth.ts `user.additionalFields` so `session.user.username`
    // is typed once here instead of `as { username?: ... }` casts at call sites.
    inferAdditionalFields({
      user: {
        username: { type: 'string', required: false },
        role: { type: 'string', required: false },
      },
    }),
  ],
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
