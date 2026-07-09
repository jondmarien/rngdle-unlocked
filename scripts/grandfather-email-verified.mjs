/**
 * Grandfather existing users as email-verified so requireEmailVerification
 * does not lock out accounts created before outbound mail was enabled.
 *
 * Usage: node --env-file=.env.local scripts/grandfather-email-verified.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sql = neon(url);
const result = await sql`
  UPDATE "user"
  SET email_verified = true
  WHERE email_verified = false
  RETURNING id, email, username
`;

console.log(`Marked ${result.length} user(s) as email_verified:`);
for (const row of result) {
  console.log(`  - ${row.username ?? '(no username)'} <${row.email}>`);
}
