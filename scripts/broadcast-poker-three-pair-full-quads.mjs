/**
 * One-shot system inbox broadcast for Three Pair & Full Quads (forward-only).
 * Usage: node --env-file=.env.local scripts/broadcast-poker-three-pair-full-quads.mjs
 * Source draft: docs/announcements/poker-three-pair-full-quads-draft.md
 */
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const id = randomUUID();
const title = 'Poker hand scoring update — Three Pair & Full Quads';
const body = [
  'We split two poker shapes that were under-scored:',
  'Rolls with three distinct pairs (for example 112233) now score as Three Pair instead of Two Pair.',
  'Rolls with four of a kind plus a pair (for example 111122) now score as Full Quads instead of Four of a Kind alone.',
  'This applies to new rolls only. Past results, leaderboard ranks, badge history, and sealed rolls are unchanged.',
].join(' ');

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
