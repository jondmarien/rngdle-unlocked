/**
 * One-shot backfill: system inbox for v0.6.0 (missed at release).
 * Usage: node --env-file=.env.local scripts/_broadcast-0.6.0-backfill.mjs
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
  WHERE title LIKE '%v0.6.0%'
  LIMIT 5
`;
if (existing.length > 0) {
  console.log('Already present — skipping insert:');
  console.log(JSON.stringify(existing, null, 2));
  process.exit(0);
}

const id = randomUUID();
const title = 'New Update! v0.6.0 — Best Roll, Features & clearer About';
const body = [
  'Leaderboard now has a Best Roll view beside Total EP (by EP or rarity, Ranked and Practice).',
  'The Features tab lets signed-in players submit ideas and upvote others.',
  'About covers rarity ladders and single-digit odds, and you can delete your cloud account from Account.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');
// Match the v0.6.0 tag time (2026-07-09 20:25:18 -0400)
const createdAt = '2026-07-10T00:25:18.000Z';

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, ${createdAt}::timestamptz)
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
