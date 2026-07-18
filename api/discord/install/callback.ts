import { createDb } from '../../../server/db/index.js';
import {
  parseDiscordInstallState,
  plusRedirect,
  upsertGuildInstall,
  userHasRarePlus,
} from '../../../server/discord/guildInstall.js';
import { createLogger } from '../../../server/logger.js';
import { defineHandler } from '../../../server/vercel-adapter.js';

const log = createLogger('api/discord/install/callback');

/**
 * GET /api/discord/install/callback
 * Discord OAuth redirect — records guild_id for Rare+ installers.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('error')) {
    return plusRedirect('discord_install=denied');
  }

  const stateParsed = parseDiscordInstallState(url.searchParams.get('state'));
  if (!stateParsed.ok) {
    return plusRedirect('discord_install=bad_state');
  }

  const guildId = url.searchParams.get('guild_id')?.trim();
  if (!guildId || !/^\d{5,32}$/.test(guildId)) {
    return plusRedirect('discord_install=missing_guild');
  }

  const db = createDb();
  const rarePlus = await userHasRarePlus(db, stateParsed.userId);
  if (!rarePlus) {
    return plusRedirect('discord_install=rare_required');
  }

  try {
    await upsertGuildInstall(db, guildId, stateParsed.userId);
    log.info('guild install allowed', {
      guildId,
      userId: stateParsed.userId,
    });
    return plusRedirect('discord_install=ok');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('guild install upsert failed', { err: message });
    return plusRedirect('discord_install=error');
  }
});
