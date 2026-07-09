import { config } from 'dotenv';
config({ path: '.env.local' });

// Use neon directly to simulate a minimal roll insert + activity
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../server/db/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

// Check if we can select users
const users = await sql`SELECT id, username FROM "user" LIMIT 3`;
console.log('users sample:', users);

// Check recent rate limit keys
const rl =
  await sql`SELECT key, count FROM rate_limits WHERE key LIKE '%sync%' ORDER BY window_start DESC LIMIT 10`;
console.log('rate limits:', rl);

// Try insert system message like rollActivity does
try {
  await sql`
    INSERT INTO system_messages (id, title, body)
    VALUES ('debug-test-msg', 'test', 'test body')
    ON CONFLICT (id) DO NOTHING
  `;
  console.log('system_messages insert ok');
} catch (e) {
  console.log('system_messages insert fail:', e.message);
}

// notifications insert with long id
try {
  const uid = users[0]?.id;
  if (uid) {
    await sql`
      INSERT INTO notifications (id, user_id, kind, title, body)
      VALUES (${'unlock-' + uid + '-test-badge'}, ${uid}, 'badge_unlock', 'test', 'body')
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('notifications insert ok');
  }
} catch (e) {
  console.log('notifications insert fail:', e.message);
}

// short_code unique: insert two with same code?
try {
  await sql`
    INSERT INTO rolls (id, user_id, number, total_ep, rarity, percentile, badges_json, rolled_at, short_code, is_public)
    VALUES ('debug-roll-a', ${users[0].id}, 1, 1, 'common', 50, '[]', NOW(), 'dupcode12', true)
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO rolls (id, user_id, number, total_ep, rarity, percentile, badges_json, rolled_at, short_code, is_public)
    VALUES ('debug-roll-b', ${users[0].id}, 2, 2, 'common', 50, '[]', NOW(), 'dupcode12', true)
  `;
  console.log('dup short_code somehow ok?');
} catch (e) {
  console.log('dup short_code fail (expected):', e.message.slice(0, 200));
}

// cleanup
await sql`DELETE FROM rolls WHERE id IN ('debug-roll-a', 'debug-roll-b')`;
await sql`DELETE FROM notifications WHERE id LIKE 'unlock-%-test-badge'`;
await sql`DELETE FROM system_messages WHERE id = 'debug-test-msg'`;
console.log('cleaned');
