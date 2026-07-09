import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb, schema } from './db';

function getDb() {
  return createDb(process.env.DATABASE_URL);
}

export function createAuth() {
  const db = getDb();
  return betterAuth({
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
      process.env.BETTER_AUTH_URL,
      process.env.VITE_APP_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean) as string[],
  });
}

export type Auth = ReturnType<typeof createAuth>;
