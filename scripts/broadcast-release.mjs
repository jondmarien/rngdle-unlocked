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
const title = 'New Update! v0.16.1 — Dialogs, unlock art & History Highlights';
const body = [
  'Confirms and prompts now use in-app dialogs instead of browser popups, and unlock chips on Roll open full badge art.',
  'Showcase moved into History → Highlights (streaks, best roll, consecutive runs). The Showcase tab is gone; /showcase still redirects.',
  'Read the full player notes: https://rngdle-unlocked.chron0.tech/whats-new',
  'Open: /whats-new',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
