/**
 * One-shot system inbox broadcast for a release.
 * Usage: node --env-file=.env.local scripts/broadcast-release.mjs
 */
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const id = randomUUID();
const title = 'New Update! v0.10.2 — Friends on the Board';
const body = [
  'Filter Ranked and Practice to people you follow with Circle → Friends, and manage that list on the new Friends tab (avatar, flair, lifetime EP, unfollow).',
  'Same follow graph as Feed — find players from Board → Find, then watch them on Friends boards.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
