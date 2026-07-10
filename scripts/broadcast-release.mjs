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
const title = 'New Update! v0.8.0 — Smoother boards, clearer onboarding';
const body = [
  'Signed-in players get a short Home checklist (username, sync, Ranked) you can dismiss anytime.',
  'Board, Feed, Features, and Arcade show a Retry when a load fails; History and Features gained search; roll lists share clearer Free / Ranked / Challenge chips.',
  'Keyboard focus and segmented toggles are easier to use — scoring and Ranked rules are unchanged.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
