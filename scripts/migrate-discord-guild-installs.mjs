/**
 * Additive Discord guild-install allowlist.
 * Safe to re-run: CREATE TABLE / INDEX IF NOT EXISTS.
 *
 * Usage: node --env-file=.env.local scripts/migrate-discord-guild-installs.mjs
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
  `CREATE TABLE IF NOT EXISTS discord_guild_installs (
    guild_id text PRIMARY KEY,
    installed_by_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS discord_guild_installs_user_idx
    ON discord_guild_installs (installed_by_user_id)`,
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
  WHERE table_schema = 'public' AND table_name = 'discord_guild_installs'
`;
console.log('discord_guild_installs:', tables.length ? 'present' : 'MISSING');
