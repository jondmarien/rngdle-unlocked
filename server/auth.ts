import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createDb, schema } from './db/index.js';

function getDb() {
  return createDb(process.env.DATABASE_URL);
}

export function createAuth() {
  const db = getDb();
  const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.VITE_APP_URL ||
    'http://localhost:5173';

  return betterAuth({
    baseURL,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        username: {
          type: 'string',
          required: false,
          input: true,
        },
      },
    },
    trustedOrigins: [
      baseURL,
      process.env.VITE_APP_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean) as string[],
  });
}

export type Auth = ReturnType<typeof createAuth>;
