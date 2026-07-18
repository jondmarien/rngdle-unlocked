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
const title = 'New Update! v0.18.3 — Ranked Boosts, Overload & Plus regen';
const body = [
  'Account now has this-hour Boosts (+30 / +60) and Overload (+90) — unused bonus ends at the next UTC hour.',
  'Ranked Plus quietly refills toward your cap every six minutes (Rare +1 · Epic +2 · Anomaly +3).',
  'At 0 Ranked left, Home offers Top up and Upgrade.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
