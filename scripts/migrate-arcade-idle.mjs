/**
 * Additive Idle Digits columns on arcade_meta.
 * Safe to re-run: ADD COLUMN IF NOT EXISTS.
 *
 * Usage: node --env-file=.env.local scripts/migrate-arcade-idle.mjs
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
  `ALTER TABLE arcade_meta
    ADD COLUMN IF NOT EXISTS idle_digits_bank integer NOT NULL DEFAULT 0`,
  `ALTER TABLE arcade_meta
    ADD COLUMN IF NOT EXISTS last_idle_claim_at timestamp NOT NULL DEFAULT now()`,
  `UPDATE arcade_meta
    SET last_idle_claim_at = COALESCE(updated_at, now())
    WHERE last_idle_claim_at IS NULL`,
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

console.log('migrate-arcade-idle done');
