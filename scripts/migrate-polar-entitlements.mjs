/**
 * Additive Polar entitlements + webhook idempotency (+ ranked_topups stub).
 * Safe to re-run: CREATE TABLE / INDEX IF NOT EXISTS.
 *
 * Usage: node --env-file=.env.local scripts/migrate-polar-entitlements.mjs
 */
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
  `CREATE TABLE IF NOT EXISTS user_entitlements (
    user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    polar_customer_id text,
    tier text NOT NULL DEFAULT 'free',
    ranked_rolls_per_hour integer NOT NULL DEFAULT 90,
    subscription_status text,
    polar_subscription_id text,
    polar_product_id text,
    current_period_end timestamp,
    past_due_since timestamp,
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS user_entitlements_polar_customer_idx
    ON user_entitlements (polar_customer_id)`,
  `CREATE TABLE IF NOT EXISTS polar_webhook_events (
    webhook_id text PRIMARY KEY,
    type text NOT NULL,
    processed_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS ranked_topups (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    utc_hour_start timestamp NOT NULL,
    bonus_rolls integer NOT NULL DEFAULT 0,
    is_overload boolean NOT NULL DEFAULT false,
    source_order_id text NOT NULL UNIQUE,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS ranked_topups_user_hour_idx
    ON ranked_topups (user_id, utc_hour_start)`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 80));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    console.error(s.slice(0, 100));
    process.exitCode = 1;
  }
}

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user_entitlements', 'polar_webhook_events', 'ranked_topups')
  ORDER BY table_name
`;
console.log('tables:', tables.map((r) => r.table_name).join(', ') || '(none)');
