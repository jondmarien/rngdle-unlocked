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
const title = 'New Update! v0.11.0 — Lighter cloud sync + Discord share cards';
const body = [
  'Signed-in sync now sends only what changed instead of re-uploading your whole history on every roll — quieter, faster, and kinder to the database.',
  'Discord share and profile previews should show the image card again.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
