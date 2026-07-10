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
const title =
  'New Update! v0.9.0 — Divine rarity, sharper poker hands, badge proofs';
const body = [
  'Divine is a new rarity above Mythic for ultra-high EP rolls — gold treatment and a bigger celebration.',
  'Poker scoring now recognizes Two Trips, Three Pair, and Full Quads (new rolls only; past history unchanged).',
  'More badge cards show math proofs, and Latest Runs has an optional spoiler-eye toggle.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
