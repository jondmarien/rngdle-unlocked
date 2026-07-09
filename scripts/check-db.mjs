import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env' });

const u = process.env.DATABASE_URL;
if (!u) {
  console.error('No DATABASE_URL');
  process.exit(1);
}
const host = new URL(u.replace(/^postgresql:/, 'http:')).hostname;
console.log('host', host);

const sql = neon(u);
const db = await sql`select current_database() as db`;
console.log('db', db[0]);

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by 1
`;
console.log(
  'tables',
  tables.map((t) => t.table_name),
);

const rollsCols = await sql`
  select column_name from information_schema.columns
  where table_name = 'rolls' order by ordinal_position
`;
console.log(
  'rolls cols',
  rollsCols.map((c) => c.column_name),
);

const counts = await sql`
  select
    (select count(*)::int from "user") as users,
    (select count(*)::int from rolls) as rolls,
    (select count(*)::int from user_progress) as progress
`;
console.log('counts', counts[0]);
