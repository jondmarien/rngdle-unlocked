/**
 * Register global Discord slash commands for the RNGdle Unlocked bot.
 *
 * Auth (either):
 *   DISCORD_BOT_TOKEN=...  (Bot token)
 *   or DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET (client credentials → applications.commands.update)
 *
 * Usage:
 *   node --env-file=.env.local scripts/register-discord-commands.mjs
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const appId = process.env.DISCORD_CLIENT_ID?.trim();
if (!appId) {
  console.error('DISCORD_CLIENT_ID required');
  process.exit(1);
}

async function authHeader() {
  const bot = process.env.DISCORD_BOT_TOKEN?.trim();
  if (bot) return `Bot ${bot}`;

  const secret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error('Set DISCORD_BOT_TOKEN or DISCORD_CLIENT_SECRET');
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'applications.commands.update',
  });
  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`token ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return `Bearer ${json.access_token}`;
}

const commands = [
  {
    name: 'roll',
    description:
      'Open the RNGdle Unlocked roll screen (Ranked Plus Rare+ required)',
    type: 1,
  },
  {
    name: 'board',
    description: 'Browse Ranked / Practice / All-Time leaderboards',
    type: 1,
  },
];

const header = await authHeader();
const url = `https://discord.com/api/v10/applications/${appId}/commands`;
const res = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: header,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(commands),
});
const text = await res.text();
if (!res.ok) {
  console.error('register failed', res.status, text);
  process.exit(1);
}
console.log('registered commands:', text);
console.log(
  '\nSet Interactions Endpoint URL to:\n  https://rngdle-unlocked.chron0.tech/api/discord/interactions',
);
console.log(
  '\nInvite (applications.commands only):\n  https://discord.com/api/oauth2/authorize?client_id=' +
    appId +
    '&scope=applications.commands',
);
