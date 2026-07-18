/**
 * Discord roll cooldowns (8s success path) via rate_limits table.
 */
import type { Db } from '../db/index.js';
import { checkRateLimit, isRateLimited } from '../rateLimit.js';

/** Milliseconds between successful channel-visible rolls per Discord user. */
export const DISCORD_ROLL_COOLDOWN_MS = 8_000;

/** Allow at most 1 successful roll per cooldown window. */
export async function checkDiscordRollCooldown(
  db: Db,
  discordSnowflake: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const rl = await checkRateLimit(
    db,
    `discord:${discordSnowflake}:roll-cd`,
    1,
    DISCORD_ROLL_COOLDOWN_MS,
  );
  if (isRateLimited(rl)) {
    return { ok: false, retryAfterSec: rl.retryAfterSec };
  }
  return { ok: true };
}
