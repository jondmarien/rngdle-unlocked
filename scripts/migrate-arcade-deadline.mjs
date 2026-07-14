/**
 * Additive Deadline columns on arcade_runs.
 * Safe to re-run: ADD COLUMN IF NOT EXISTS.
 *
 * Usage: node --env-file=.env.local scripts/migrate-arcade-deadline.mjs
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
  `ALTER TABLE arcade_runs
    ADD COLUMN IF NOT EXISTS deadline_target_digits integer NOT NULL DEFAULT 0`,
  `ALTER TABLE arcade_runs
    ADD COLUMN IF NOT EXISTS deadline_rolls_remaining integer NOT NULL DEFAULT 0`,
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

console.log('migrate-arcade-deadline done');
