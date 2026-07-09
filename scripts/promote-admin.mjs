/**
 * One-time / break-glass: promote a user to role=admin.
 * Requires ADMIN_SECRET matching env (never expose this to the browser).
 *
 * Usage:
 *   node scripts/promote-admin.mjs --email you@example.com
 *   node scripts/promote-admin.mjs --username chron0
 *   ADMIN_SECRET=… node scripts/promote-admin.mjs --email you@example.com
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

const provided =
  process.env.PROMOTE_ADMIN_SECRET ||
  process.argv
    .find((a) => a.startsWith('--secret='))
    ?.slice('--secret='.length) ||
  null;

const adminSecret = process.env.ADMIN_SECRET;
if (!adminSecret) {
  console.error('ADMIN_SECRET is not set in env');
  process.exit(1);
}

// Prefer interactive confirmation via matching env; allow --secret= for CI
const ok =
  provided === adminSecret ||
  (process.env.CONFIRM_PROMOTE === 'yes' && !provided);

if (!ok) {
  console.error(
    'Refusing promote: set CONFIRM_PROMOTE=yes (uses ADMIN_SECRET from env) or pass --secret=<ADMIN_SECRET>',
  );
  process.exit(1);
}

const email = arg('email')?.trim().toLowerCase() ?? null;
const username = arg('username')?.trim().toLowerCase() ?? null;
if (!email && !username) {
  console.error('Pass --email <addr> or --username <handle>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);

const rows = email
  ? await sql`SELECT id, email, username, role FROM "user" WHERE lower(email) = ${email} LIMIT 1`
  : await sql`SELECT id, email, username, role FROM "user" WHERE lower(username) = ${username} LIMIT 1`;

const user = rows[0];
if (!user) {
  console.error('User not found');
  process.exit(1);
}

await sql`UPDATE "user" SET role = 'admin', updated_at = now() WHERE id = ${user.id}`;
console.log('promoted to admin:', {
  id: user.id,
  email: user.email,
  username: user.username,
  previousRole: user.role,
});
