import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = neon(url);
await sql`ALTER TABLE rolls ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'client'`;
const cols = await sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'rolls' AND column_name = 'source'
`;
console.log('rolls.source ready:', cols);
