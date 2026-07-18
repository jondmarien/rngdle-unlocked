/**
 * Additive: user.profile_frame column for subscription / future Ranked frames.
 *
 * Usage: node --env-file=.env.local scripts/migrate-profile-frame.mjs
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
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS profile_frame text NOT NULL DEFAULT 'none'`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 100));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

console.log('migrate-profile-frame done');
