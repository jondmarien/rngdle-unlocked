/**
 * Additive username change cooldown + former-handle holds.
 * Safe to re-run: ADD COLUMN / CREATE TABLE / INDEX IF NOT EXISTS.
 *
 * Usage: node --env-file=.env.local scripts/migrate-username-holds.mjs
 */
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);

const stmts = [
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username_changed_at timestamp`,
  `CREATE TABLE IF NOT EXISTS username_holds (
    username text PRIMARY KEY,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    expires_at timestamp NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS username_holds_expires_idx
    ON username_holds (expires_at)`,
  `CREATE INDEX IF NOT EXISTS username_holds_user_idx
    ON username_holds (user_id)`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 80));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    console.error(s.slice(0, 100));
    process.exitCode = 1;
  }
}

const col = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user'
    AND column_name = 'username_changed_at'
`;
const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'username_holds'
`;
console.log(
  'username_changed_at:',
  col.length ? 'present' : 'MISSING',
  '| username_holds:',
  tables.length ? 'present' : 'MISSING',
);
