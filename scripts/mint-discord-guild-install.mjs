/**
 * Mint a one-time Discord guild-install URL for a specific user.
 * Does not require Ranked Plus / admin override — ops dogfood / friend invite.
 *
 * Usage:
 *   node --env-file=.env.local scripts/mint-discord-guild-install.mjs --username=chrono
 *   node --env-file=.env.local scripts/mint-discord-guild-install.mjs --user-id=...
 *
 * The recipient opens the printed Discord OAuth URL, picks a server, and
 * /api/discord/install/callback allowlists that guild under their user id.
 */
import { createHmac } from 'node:crypto';
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const GRANT_TTL_MS = 24 * 60 * 60 * 1000;

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const username = arg('username')?.trim().toLowerCase().replace(/^@/, '');
const userIdArg = arg('user-id')?.trim();
const originArg = arg('origin')?.trim();
if (!username && !userIdArg) {
  console.error(
    'Usage: --username=<handle>  or  --user-id=<id>  [--origin=https://rngdle-unlocked.chron0.tech]',
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
const clientId = process.env.DISCORD_CLIENT_ID?.trim();
const secret =
  process.env.BETTER_AUTH_SECRET ||
  process.env.ATTEST_SECRET ||
  'dev-only-discord-install-secret';
/** Prefer --origin; avoid minting localhost when .env.local points at Vite. */
const origin = (
  originArg ||
  process.env.DISCORD_INSTALL_ORIGIN ||
  (process.env.BETTER_AUTH_URL?.includes('localhost')
    ? 'https://rngdle-unlocked.chron0.tech'
    : process.env.BETTER_AUTH_URL) ||
  process.env.VITE_APP_URL ||
  'https://rngdle-unlocked.chron0.tech'
).replace(/\/$/, '');
if (/localhost|127\.0\.0\.1/.test(origin)) {
  console.warn(
    'warn: redirect_uri is localhost — Discord portal must allow it, and the API must be running there.\n' +
      'For production invites use: --origin=https://rngdle-unlocked.chron0.tech',
  );
}

if (!databaseUrl) {
  console.error('DATABASE_URL required');
  process.exit(1);
}
if (!clientId) {
  console.error('DISCORD_CLIENT_ID required');
  process.exit(1);
}

const sql = neon(databaseUrl);
const rows = userIdArg
  ? await sql`
      SELECT id, username, role, email
      FROM "user"
      WHERE id = ${userIdArg}
      LIMIT 1
    `
  : await sql`
      SELECT id, username, role, email
      FROM "user"
      WHERE lower(username) = ${username}
      LIMIT 1
    `;

const user = rows[0];
if (!user) {
  console.error('User not found');
  process.exit(1);
}

const now = Date.now();
const exp = String(now + GRANT_TTL_MS);
const flag = '1';
const payload = `${user.id}.${exp}.${flag}`;
const sig = createHmac('sha256', secret).update(payload).digest('hex');
const state = `${payload}.${sig}`;

const redirectUri = `${origin}/api/discord/install/callback`;
const params = new URLSearchParams({
  client_id: clientId,
  response_type: 'code',
  scope: 'applications.commands',
  redirect_uri: redirectUri,
  state,
  integration_type: '0',
});
const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

console.log(
  JSON.stringify(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      expiresAt: new Date(Number(exp)).toISOString(),
      note: 'Ops bypass — no Rare+ required. Treat this URL as a secret.',
      inviteUrl: url,
    },
    null,
    2,
  ),
);
