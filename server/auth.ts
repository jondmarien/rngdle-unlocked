import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin } from 'better-auth/plugins';
import { createDb, schema } from './db/index.js';
import { sendEmail } from './email.js';

function getDb() {
  return createDb(process.env.DATABASE_URL);
}

/** Production base URL for cookies + CSRF. Prefer explicit env, then Vercel. */
function resolveBaseURL(): string {
  // Prefer production app URL when set; never leave localhost on Vercel.
  const explicit = process.env.BETTER_AUTH_URL || process.env.VITE_APP_URL;
  if (
    explicit &&
    !explicit.includes('localhost') &&
    !explicit.includes('127.0.0.1')
  ) {
    return explicit.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }
  if (explicit) return explicit.replace(/\/$/, '');
  return 'http://localhost:5173';
}

function socialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {};
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
      // Magic link + Resend verification were unreliable; any email + password works.
      requireEmailVerification: false,
    },
    ...(Object.keys(social).length > 0
      ? {
          socialProviders: social,
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ['github', 'discord'],
              // Discord/GitHub emails often differ from the credential email
              // (e.g. jon@chron0.tech vs Discord's registered address).
              allowDifferentEmails: true,
              // Default true blocked Discord when a prior email/magic-link attempt
              // created an unverified local user with the same address
              // → redirect /account?error=account_not_linked.
              requireLocalEmailVerified: false,
            },
          },
        }
      : {}),
    // Treat email as usable immediately (no inbox verification gate).
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              emailVerified: true,
            },
          }),
        },
      },
    },
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
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async ({
          user,
          url,
        }: {
          user: { email: string };
          url: string;
        }) => {
          void sendEmail({
            to: user.email,
            subject: 'Confirm RNGdle Unlocked account deletion',
            text: `Confirm permanent deletion of your RNGdle Unlocked account:\n\n${url}\n\nThis removes your cloud account, synced rolls, and related social data. Local browser data is separate (clear site data if you want that gone too).\n\nIf you did not request this, ignore this message.`,
            html: `<p>Confirm permanent deletion of your <strong>RNGdle Unlocked</strong> account.</p><p><a href="${url}">Click here to delete your account</a></p><p>This removes your cloud account, synced rolls, and related social data. Local browser data is separate (clear site data if you want that gone too).</p><p>If you did not request this, ignore this message.</p>`,
          });
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
      // Production + beta custom domains (CORS / CSRF for Better Auth)
      'https://rngdle-unlocked.chron0.tech',
      'https://rngdle-unlocked-beta.chron0.tech',
      ...(process.env.EXTRA_TRUSTED_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean) as string[],
  });
}

export type Auth = ReturnType<typeof createAuth>;
