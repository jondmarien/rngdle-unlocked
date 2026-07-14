/**
 * Additive trash soft-fail columns on arcade_runs.
 *
 * Usage: node --env-file=.env.local scripts/migrate-arcade-trash-softfail.mjs
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
    ADD COLUMN IF NOT EXISTS trash_streak integer NOT NULL DEFAULT 0`,
  `ALTER TABLE arcade_runs
    ADD COLUMN IF NOT EXISTS soft_fail_rolls_remaining integer NOT NULL DEFAULT 0`,
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

console.log('migrate-arcade-trash-softfail done');
