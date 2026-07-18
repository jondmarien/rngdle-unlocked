import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import {
  createDiscordInstallState,
  discordInstallAuthorizeUrl,
  plusRedirect,
  userHasRarePlus,
} from '../../server/discord/guildInstall.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/discord/install');

/**
 * GET /api/discord/install
 * Rare+ only — start Discord OAuth to add the app to a guild.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(
    request,
    'Sign in to add the Discord app to a server',
  );
  if (!gate.ok) {
    return plusRedirect('discord_install=signin');
  }

  const db = createDb();
  const limited = await rateGuard(
    db,
    `user:${gate.user.id}:discord-install`,
    LIMITS.discordInstallPerMinute,
    60_000,
  );
  if (limited) return limited;

  const rarePlus = await userHasRarePlus(db, gate.user.id);
  if (!rarePlus) {
    return plusRedirect('discord_install=rare_required');
  }

  try {
    const state = createDiscordInstallState(gate.user.id);
    const url = discordInstallAuthorizeUrl(state);
    return Response.redirect(url, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('install redirect failed', { err: message });
    return plusRedirect('discord_install=config_error');
  }
});
