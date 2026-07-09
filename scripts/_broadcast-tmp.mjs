import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

const sql = neon(process.env.DATABASE_URL);
const id = randomUUID();
const title = "New Update! v0.5.1 — Link Previews & What's New";
const body = `Sharing pages like Leaderboard or About now gets a proper Discord preview card.

About also has a What's new section with player-friendly release notes — open https://rngdle-unlocked.chron0.tech/about (or the About tab) to read the full list.`;

const rows = await sql`
  INSERT INTO system_messages (id, title, body, created_at)
  VALUES (${id}, ${title}, ${body}, now())
  RETURNING id, title, created_at
`;
console.log(JSON.stringify(rows, null, 2));
