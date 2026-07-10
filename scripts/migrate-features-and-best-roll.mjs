import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);

const stmts = [
  `CREATE INDEX IF NOT EXISTS rolls_leaderboard_source_public_ep_idx
    ON rolls (source, is_public, total_ep DESC, rolled_at ASC)`,
  `CREATE INDEX IF NOT EXISTS rolls_leaderboard_user_source_ep_idx
    ON rolls (user_id, source, is_public, total_ep DESC)`,
  `CREATE TABLE IF NOT EXISTS feature_requests (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'submitted',
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS feature_requests_status_created_idx
    ON feature_requests (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS feature_requests_created_idx
    ON feature_requests (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS feature_request_votes (
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    request_id text NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, request_id)
  )`,
  `CREATE INDEX IF NOT EXISTS feature_request_votes_request_idx
    ON feature_request_votes (request_id)`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 90));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    console.error(s.slice(0, 120));
    process.exitCode = 1;
  }
}

console.log('migrate-features-and-best-roll done');
