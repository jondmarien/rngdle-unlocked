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

console.log(
  'ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS image_url text',
);
await sql`ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS image_url text`;
console.log('ok: feature_requests.image_url');
