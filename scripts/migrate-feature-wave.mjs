import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);

const stmts = [
  `ALTER TABLE rolls ADD COLUMN IF NOT EXISTS short_code text`,
  `ALTER TABLE rolls ADD COLUMN IF NOT EXISTS attestation_seal text`,
  `ALTER TABLE rolls ADD COLUMN IF NOT EXISTS attested_at timestamp`,
  `ALTER TABLE rolls ADD COLUMN IF NOT EXISTS challenge_key text`,
  `CREATE TABLE IF NOT EXISTS follows (
    follower_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    following_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    kind text NOT NULL,
    title text NOT NULL,
    body text NOT NULL DEFAULT '',
    href text,
    actor_username text,
    read_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON notifications (user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS system_messages (
    id text PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS system_message_reads (
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    message_id text NOT NULL REFERENCES system_messages(id) ON DELETE CASCADE,
    read_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, message_id)
  )`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 72));
  } catch (e) {
    console.error('fail:', e.message);
    console.error(s.slice(0, 80));
  }
}

const cols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'rolls'
  ORDER BY ordinal_position
`;
console.log(
  'rolls cols:',
  cols.map((c) => c.column_name).join(', '),
);

const t = await sql`SELECT to_regclass('public.follows') as t`;
console.log('follows table:', t[0]?.t);

// Unique short_code only when no duplicates (nulls allowed)
try {
  const dups = await sql`
    SELECT short_code, COUNT(*)::int AS n
    FROM rolls
    WHERE short_code IS NOT NULL
    GROUP BY short_code
    HAVING COUNT(*) > 1
    LIMIT 5
  `;
  if (dups.length === 0) {
    await sql.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS rolls_short_code_unique ON rolls (short_code)`,
    );
    console.log('ok: unique index on short_code');
  } else {
    console.log('skip unique short_code — duplicates exist', dups);
  }
} catch (e) {
  console.error('short_code index:', e.message);
}
