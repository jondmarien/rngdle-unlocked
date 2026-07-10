/**
 * One-shot backfill: system inbox for v0.7.0 (missed at release).
 * Usage: node --env-file=.env.local scripts/_broadcast-0.7.0-backfill.mjs
 */
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const existing = await sql`
  SELECT id, title, created_at
  FROM system_messages
  WHERE title LIKE '%v0.7.0%'
  LIMIT 5
`;
if (existing.length > 0) {
  console.log('Already present — skipping insert:');
  console.log(JSON.stringify(existing, null, 2));
  process.exit(0);
}

const id = randomUUID();
const title = 'New Update! v0.7.0 — Arcade Mode and a clearer Board';
const body = [
  'Arcade Mode is live: Digits runs with upgrades, cash-out, and a separate Arcade leaderboard — Digits never become EP.',
  'Leaderboard tabs are now Ranked | Practice | Arcade | Feed | Find.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');
// Match the 0.7.0 release bump commit (2026-07-09 21:38:16 -0400)
const createdAt = '2026-07-10T01:38:16.000Z';

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, ${createdAt}::timestamptz)
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
