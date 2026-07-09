import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin } from 'better-auth/plugins';
import { createDb, schema } from './db/index.js';

function getDb() {
  return createDb(process.env.DATABASE_URL);
}

/** Production base URL for cookies + CSRF. Prefer explicit env, then Vercel. */
function resolveBaseURL(): string {
  // Prefer production app URL when set; never leave localhost on Vercel.
  const explicit = process.env.BETTER_AUTH_URL || process.env.VITE_APP_URL;
  if (explicit && !explicit.includes('localhost') && !explicit.includes('127.0.0.1')) {
    return explicit.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }
  if (explicit) return explicit.replace(/\/$/, '');
  return 'http://localhost:5173';
}

function socialProviders() {
  const providers: Record<
    string,
    { clientId: string; clientSecret: string }
  > = {};
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    providers.discord = {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    };
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  return providers;
}

function adminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }

  const db = getDb();
  const baseURL = resolveBaseURL();
  const social = socialProviders();

  return betterAuth({
    secret,
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
    ...(Object.keys(social).length > 0
      ? {
          socialProviders: social,
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ['github', 'discord'],
            },
          },
        }
      : {}),
    user: {
      additionalFields: {
        username: {
          type: 'string',
          required: false,
          input: true,
        },
        role: {
          type: 'string',
          required: false,
          defaultValue: 'user',
          input: false,
        },
      },
    },
    plugins: [
      admin({
        defaultRole: 'user',
        adminRoles: ['admin'],
        adminUserIds: adminUserIds(),
      }),
    ],
    trustedOrigins: [
      baseURL,
      process.env.VITE_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean) as string[],
  });
}

export type Auth = ReturnType<typeof createAuth>;
