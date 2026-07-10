/**
 * Backfill public @username for accounts that never claimed one
 * (username IS NULL). Leaderboards require a non-null username.
 *
 * Dry-run by default. Apply with --apply.
 *
 *   node --env-file=.env.local scripts/backfill-usernames.mjs
 *   node --env-file=.env.local scripts/backfill-usernames.mjs --apply
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const apply = process.argv.includes('--apply');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);

function sanitize(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

function suggest(row) {
  const fromName = sanitize(row.name);
  if (USERNAME_RE.test(fromName)) return fromName;
  const local = String(row.email ?? '').split('@')[0] ?? '';
  const fromEmail = sanitize(local);
  if (USERNAME_RE.test(fromEmail)) return fromEmail;
  const fallback = `u_${String(row.id)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 20)}`;
  if (USERNAME_RE.test(fallback)) return fallback;
  return `user_${String(row.id).slice(0, 8).toLowerCase()}`;
}

const missing =
  await sql`SELECT id, email, name, username FROM "user" WHERE username IS NULL ORDER BY created_at ASC`;

if (missing.length === 0) {
  console.log('No users with null username. Nothing to do.');
  process.exit(0);
}

console.log(
  `Found ${missing.length} user(s) without @username (${apply ? 'APPLY' : 'dry-run'}):\n`,
);

const taken = new Set(
  (await sql`SELECT username FROM "user" WHERE username IS NOT NULL`).map(
    (r) => r.username,
  ),
);

let updated = 0;
let skipped = 0;

for (const row of missing) {
  let base = suggest(row);
  if (!USERNAME_RE.test(base)) {
    console.log(`SKIP ${row.id} (${row.email}) — could not derive handle`);
    skipped += 1;
    continue;
  }

  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    const suffix = `_${n}`;
    candidate = `${base.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`;
    n += 1;
    if (n > 999) {
      candidate = null;
      break;
    }
  }

  if (!candidate || !USERNAME_RE.test(candidate)) {
    console.log(`SKIP ${row.id} (${row.email}) — collision exhaustion`);
    skipped += 1;
    continue;
  }

  console.log(
    `${apply ? 'SET' : 'WOULD'} ${row.email}  name=${JSON.stringify(row.name)}  →  @${candidate}`,
  );

  if (apply) {
    await sql`UPDATE "user" SET username = ${candidate}, updated_at = now() WHERE id = ${row.id} AND username IS NULL`;
    taken.add(candidate);
    updated += 1;
  } else {
    taken.add(candidate);
  }
}

console.log(
  `\nDone. ${apply ? `Updated ${updated}` : `Dry-run planned ${missing.length - skipped}`}, skipped ${skipped}.`,
);
if (!apply) {
  console.log('Re-run with --apply to write changes.');
}
