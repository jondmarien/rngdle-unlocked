/**
 * Additive Arcade Mode tables (Digits economy — isolated from rolls / EP).
 * Usage: node --env-file=.env.local scripts/migrate-arcade.mjs
 */
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
  `CREATE TABLE IF NOT EXISTS arcade_meta (
    user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    unlocked_upgrade_ids text NOT NULL DEFAULT '[]',
    total_runs_completed integer NOT NULL DEFAULT 0,
    best_run_score integer NOT NULL DEFAULT 0,
    lifetime_digits_cashed integer NOT NULL DEFAULT 0,
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS arcade_runs (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active',
    digits integer NOT NULL DEFAULT 0,
    peak_digits integer NOT NULL DEFAULT 0,
    roll_count integer NOT NULL DEFAULT 0,
    combo_streak integer NOT NULL DEFAULT 0,
    owned_upgrades_json text NOT NULL DEFAULT '[]',
    cooldowns_json text NOT NULL DEFAULT '{}',
    surge_rolls_remaining integer NOT NULL DEFAULT 0,
    pending_active_json text NOT NULL DEFAULT '{}',
    shop_offer_json text NOT NULL DEFAULT '[]',
    run_score integer,
    started_at timestamp NOT NULL DEFAULT now(),
    ended_at timestamp
  )`,
  `CREATE INDEX IF NOT EXISTS arcade_runs_user_status_idx
    ON arcade_runs (user_id, status)`,
  `CREATE INDEX IF NOT EXISTS arcade_meta_best_score_idx
    ON arcade_meta (best_run_score DESC)`,
  `CREATE TABLE IF NOT EXISTS arcade_run_rolls (
    id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES arcade_runs(id) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    number integer NOT NULL,
    total_ep integer NOT NULL,
    rarity text NOT NULL,
    badges_json text NOT NULL DEFAULT '[]',
    digits_awarded integer NOT NULL DEFAULT 0,
    rolled_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS arcade_run_rolls_run_idx
    ON arcade_run_rolls (run_id, rolled_at DESC)`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 80));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    console.error(s.slice(0, 100));
    process.exit(1);
  }
}

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'arcade%'
  ORDER BY table_name
`;
console.log(
  'arcade tables:',
  tables.map((t) => t.table_name).join(', ') || '(none)',
);
