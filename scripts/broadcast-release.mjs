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
const title = 'New Update! v0.14.0 — Atomic Registry';
const body = [
  'Atomic Registry is live: collect all 118 elements from the last three digits of your rolls, capped by the Atomic Seal.',
  'The existing Element digit badges and Periodic Crown stay exactly as they were — this is a brand-new family beside them.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
