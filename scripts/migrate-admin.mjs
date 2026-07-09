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
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_reason text`,
  `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_expires timestamp`,
  `ALTER TABLE session ADD COLUMN IF NOT EXISTS impersonated_by text`,
  `CREATE TABLE IF NOT EXISTS user_reports (
    id text PRIMARY KEY,
    reporter_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    target_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    created_at timestamp NOT NULL DEFAULT now(),
    resolved_by text REFERENCES "user"(id) ON DELETE SET NULL,
    resolved_at timestamp
  )`,
  `CREATE INDEX IF NOT EXISTS user_reports_status_created_idx
    ON user_reports (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS user_reports_target_idx
    ON user_reports (target_user_id)`,
  `CREATE TABLE IF NOT EXISTS admin_audit_log (
    id text PRIMARY KEY,
    actor_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    meta_json text NOT NULL DEFAULT '{}',
    ip text,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
    ON admin_audit_log (created_at DESC)`,
];

for (const s of stmts) {
  try {
    await sql.query(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 80));
  } catch (e) {
    console.error('fail:', e instanceof Error ? e.message : e);
    console.error(s.slice(0, 100));
  }
}

const cols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'user'
  ORDER BY ordinal_position
`;
console.log(
  'user cols:',
  cols.map((c) => c.column_name).join(', '),
);

const tables = await sql`
  SELECT to_regclass('public.user_reports') AS reports,
         to_regclass('public.admin_audit_log') AS audit
`;
console.log('user_reports:', tables[0]?.reports);
console.log('admin_audit_log:', tables[0]?.audit);
