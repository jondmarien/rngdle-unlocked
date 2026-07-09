import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

const users = await sql`
  SELECT id, email, username, role
  FROM "user"
  WHERE lower(email) = 'jon@chron0.tech' OR lower(username) = 'chron0'
`;
console.log('users:', users);

if (users[0]) {
  const accounts = await sql`
    SELECT id, provider_id, account_id, user_id,
           (access_token IS NOT NULL) AS has_token
    FROM account
    WHERE user_id = ${users[0].id}
  `;
  console.log('accounts:', accounts);
}

console.log(
  'discord env set:',
  Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
);
console.log(
  'github env set:',
  Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
);
