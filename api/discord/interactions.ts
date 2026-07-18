import { rateGuard } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { handleDiscordInteraction } from '../../server/discord/router.js';
import { verifyDiscordInteraction } from '../../server/discord/verify.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/discord/interactions');

/** Cold path: verify + roll persist. */
export const config = {
  maxDuration: 30,
};

/**
 * POST /api/discord/interactions
 * Discord Interactions Endpoint (HTTP) — Ed25519 verified, no Gateway.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey) {
    log.error('DISCORD_PUBLIC_KEY missing');
    return Response.json({ error: 'Discord not configured' }, { status: 503 });
  }

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) {
    return Response.json({ error: 'Missing signature' }, { status: 401 });
  }

  const rawBody = await request.text();
  const ok = verifyDiscordInteraction({
    publicKeyHex: publicKey,
    signatureHex: signature,
    timestamp,
    rawBody,
  });
  if (!ok) {
    log.warn('invalid discord signature');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let interaction: {
    type: number;
    id?: string;
    token?: string;
    application_id?: string;
    data?: { name?: string; custom_id?: string; values?: string[] };
    member?: { user?: { id: string } };
    user?: { id: string };
  };
  try {
    interaction = JSON.parse(rawBody) as typeof interaction;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // PING must be fast — no DB
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
  }

  try {
    const db = createDb();
    const snowflake =
      interaction.member?.user?.id ?? interaction.user?.id ?? 'unknown';
    const limited = await rateGuard(
      db,
      `discord:${snowflake}:interactions`,
      LIMITS.discordInteractionsPerMinute,
      60_000,
      { error: 'Too many Discord interactions — slow down.' },
    );
    if (limited) {
      // Discord expects interaction response shape, not our JSON 429
      return Response.json({
        type: 4,
        data: {
          content: 'Too many interactions — slow down (30/min).',
          flags: 64,
        },
      });
    }

    const payload = await handleDiscordInteraction(db, interaction as never);
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('interaction failed', { err: message });
    return Response.json({
      type: 4,
      data: {
        content: 'Something went wrong. Try `/roll` again.',
        flags: 64,
      },
    });
  }
});
