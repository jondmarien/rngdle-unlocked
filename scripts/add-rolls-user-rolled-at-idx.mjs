/**
 * Additive index for sync history loads:
 *   SELECT … FROM rolls WHERE user_id = ? ORDER BY rolled_at DESC LIMIT 500
 *
 * Without this, loadCloudSave scanned every lifetime roll for the user
 * (Neon egress) then sliced to 500 in app memory.
 *
 * Usage: node --env-file=.env.local scripts/add-rolls-user-rolled-at-idx.mjs
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);
await sql`CREATE INDEX IF NOT EXISTS rolls_user_rolled_at_idx
  ON rolls (user_id, rolled_at DESC)`;
const rows = await sql`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE indexname = 'rolls_user_rolled_at_idx'
`;
console.log('rolls_user_rolled_at_idx ready:', rows);
