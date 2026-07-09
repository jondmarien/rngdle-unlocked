import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);

const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'rolls' ORDER BY ordinal_position
`;
console.log('rolls:', cols.map((c) => c.column_name).join(', '));

const n = await sql`SELECT to_regclass('public.notifications') as t`;
console.log('notifications:', n[0]?.t);

const s = await sql`SELECT to_regclass('public.system_messages') as t`;
console.log('system_messages:', s[0]?.t);

const idx = await sql`
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'rolls'
`;
for (const i of idx) console.log('idx', i.indexname, '→', i.indexdef);

// try importing rollActivity the same way serverless would
try {
  await import('../server/rollActivity.ts');
  console.log('rollActivity import: ok');
} catch (e) {
  console.log('rollActivity import fail:', e.message);
}
