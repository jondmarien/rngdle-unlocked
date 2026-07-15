/**
 * Additive settings_sync_enabled gate on user_progress.
 * Safe to re-run: ADD COLUMN IF NOT EXISTS.
 *
 * Usage: node --env-file=.env.local scripts/migrate-settings-sync.mjs
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
  `ALTER TABLE user_progress
    ADD COLUMN IF NOT EXISTS settings_sync_enabled boolean NOT NULL DEFAULT false`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 120));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

console.log('migrate-settings-sync done');
