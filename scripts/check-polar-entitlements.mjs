/**
 * Ops check: are any non-admin Rare+ entitlements populated?
 * Usage: node --env-file=.env.local scripts/check-polar-entitlements.mjs
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
const rows = await sql`
  SELECT u.email, u.username, u.role, e.tier, e.subscription_status,
    (e.polar_subscription_id IS NOT NULL) AS has_sub
  FROM user_entitlements e
  JOIN "user" u ON u.id = e.user_id
  WHERE e.tier IN ('rare', 'epic', 'anomaly')
  ORDER BY e.updated_at DESC NULLS LAST
  LIMIT 20
`;

console.log('entitlements:', JSON.stringify(rows, null, 2));
const paidNonAdmin = rows.filter(
  (r) => r.role !== 'admin' && (r.has_sub === true || r.has_sub === 't'),
);
console.log('non_admin_with_polar_sub:', paidNonAdmin.length);
console.log('webhook_secret_set:', Boolean(process.env.POLAR_WEBHOOK_SECRET));
console.log('api_key_set:', Boolean(process.env.POLAR_API_KEY));
console.log(
  'public_invite_green:',
  paidNonAdmin.length > 0
    ? 'YES — non-admin Rare+ with Polar sub found'
    : 'NO — only admin / empty; do not announce public invite yet',
);
