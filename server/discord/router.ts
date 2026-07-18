/**
 * Discord interaction routing (slash + components).
 */
import type { Db } from '../db/index.js';
import { createLogger } from '../logger.js';
import { leaderboardResponse } from '../leaderboard.js';
import { getEffectiveRankedLimit } from '../polar/entitlements.js';
import { rankedRegenMapUsed, rankedRollRateKey } from '../rankedQuota.js';
import { checkRateLimitUtcHour, isRateLimited } from '../rateLimit.js';
import { getPublicIdentity, issueRankedRoll } from '../rankedRoll.js';
import { checkDiscordRollCooldown } from './cooldown.js';
import {
  isGuildInstallAllowed,
  isGuildInstallContext,
} from './guildInstall.js';
import {
  resolveDiscordUser,
  SITE_ORIGIN,
  type DiscordLinkedUser,
} from './identity.js';
import { issueDiscordChallengeRoll, issueDiscordRoll } from './rolls.js';
import {
  boardScreen,
  ephemeralText,
  idleRollScreen,
  messageResponse,
  resultScreen,
  type DiscordMode,
  updateMessageResponse,
} from './ui.js';

const log = createLogger('discord-router');

const PAGE_SIZE = 10;

type Interaction = {
  id: string;
  token: string;
  type: number;
  application_id: string;
  guild_id?: string;
  authorizing_integration_owners?: Record<string, string>;
  data?: {
    name?: string;
    custom_id?: string;
    values?: string[];
  };
  member?: { user?: { id: string; username?: string } };
  user?: { id: string; username?: string };
  message?: { id: string };
};

function discordUserId(i: Interaction): string | null {
  return i.member?.user?.id ?? i.user?.id ?? null;
}

function parseMode(raw: string | undefined): DiscordMode {
  if (
    raw === 'ranked' ||
    raw === 'daily' ||
    raw === 'weekly' ||
    raw === 'free'
  ) {
    return raw;
  }
  return 'free';
}

async function gateUser(
  db: Db,
  snowflake: string,
  interaction: Interaction,
): Promise<
  | { ok: true; user: DiscordLinkedUser }
  | { ok: false; response: Record<string, unknown> }
> {
  const linked = await resolveDiscordUser(db, snowflake);
  if (!linked) {
    return {
      ok: false,
      response: ephemeralText(
        `Link Discord on Account first, then claim a public @username.\n${SITE_ORIGIN}/account`,
      ),
    };
  }
  if (!linked.username) {
    return {
      ok: false,
      response: ephemeralText(
        `Claim a public @username on Account before rolling.\n${SITE_ORIGIN}/account`,
      ),
    };
  }

  // Anyone linked can play (user-install / DMs). Guild installs need Rare+ allowlist.
  if (isGuildInstallContext(interaction)) {
    const guildId = interaction.guild_id?.trim();
    if (!guildId) {
      return {
        ok: false,
        response: ephemeralText(
          `This server is not authorized for guild install.\nRare+ members can add the app from ${SITE_ORIGIN}/plus`,
        ),
      };
    }
    const allowed = await isGuildInstallAllowed(db, guildId);
    if (!allowed) {
      return {
        ok: false,
        response: ephemeralText(
          `Playing here needs a Ranked Plus (**Rare+**) member to add the app to this server.\nAdd from: ${SITE_ORIGIN}/api/discord/install\n(Or use a personal / user install — play stays free.)`,
        ),
      };
    }
  }

  return { ok: true, user: linked };
}

function tierLabel(user: DiscordLinkedUser): string {
  return user.rankedTier === 'free'
    ? 'Free'
    : `Ranked Plus · ${user.rankedTier}`;
}

async function runRoll(
  db: Db,
  user: DiscordLinkedUser,
  mode: DiscordMode,
): Promise<{
  roll: Awaited<ReturnType<typeof issueDiscordRoll>>;
  note?: string;
}> {
  if (mode === 'ranked') {
    const rankedLimit = await getEffectiveRankedLimit(db, user.userId);
    const mapUsed = await rankedRegenMapUsed(db, user.userId);
    const limited = await checkRateLimitUtcHour(
      db,
      rankedRollRateKey(user.userId),
      rankedLimit,
      { mapUsed },
    );
    if (isRateLimited(limited)) {
      throw new Error(
        `Ranked hour cap — try again in ~${limited.retryAfterSec}s (${limited.quota.remaining}/${limited.quota.limit} left).`,
      );
    }
    const identity = await getPublicIdentity(db, user.userId);
    if (!identity) throw new Error('Username required for Ranked.');
    const roll = await issueRankedRoll(db, {
      userId: user.userId,
      username: identity.username,
      name: identity.name,
    });
    return { roll };
  }

  if (mode === 'daily' || mode === 'weekly') {
    const { roll, reused } = await issueDiscordChallengeRoll(db, {
      userId: user.userId,
      username: user.username,
      name: user.name,
      kind: mode,
    });
    return {
      roll,
      note: reused
        ? `Already rolled this ${mode} — showing your existing result.`
        : undefined,
    };
  }

  const roll = await issueDiscordRoll(db, {
    userId: user.userId,
    username: user.username,
    name: user.name,
  });
  return { roll };
}

async function fetchBoardPage(
  db: Db,
  scope: 'ranked' | 'practice' | 'alltime',
  page: number,
): Promise<{ lines: string[]; hasPrev: boolean; hasNext: boolean }> {
  const safePage = Math.max(0, page);
  const req = new Request(
    `${SITE_ORIGIN}/api/leaderboard?scope=${scope}&period=all&view=total&sort=ep&limit=100`,
  );
  const res = await leaderboardResponse(db, req, Date.now());
  const json = (await res.json()) as {
    entries?: Array<{
      rank: number;
      username: string | null;
      totalEp?: number;
      lifetimeEp?: number;
      rolls?: number;
    }>;
  };
  const entries = json.entries ?? [];
  const slice = entries.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const lines = slice.map((e) => {
    const ep = e.totalEp ?? e.lifetimeEp ?? 0;
    const handle = e.username ? `@${e.username}` : 'player';
    return `**#${e.rank}** ${handle} · ${ep.toLocaleString('en-US')} EP`;
  });
  return {
    lines,
    hasPrev: safePage > 0,
    hasNext: (safePage + 1) * PAGE_SIZE < entries.length,
  };
}

export async function handleDiscordInteraction(
  db: Db,
  interaction: Interaction,
): Promise<Record<string, unknown>> {
  // PING
  if (interaction.type === 1) {
    return { type: 1 };
  }

  const snowflake = discordUserId(interaction);
  if (!snowflake) {
    return ephemeralText('Could not resolve Discord user.');
  }

  // APPLICATION_COMMAND
  if (interaction.type === 2) {
    const name = interaction.data?.name;
    if (name === 'roll') {
      const gated = await gateUser(db, snowflake, interaction);
      if (!gated.ok) return gated.response;
      const screen = idleRollScreen({
        mode: 'free',
        username: gated.user.username!,
        tierLabel: tierLabel(gated.user),
      });
      return messageResponse(screen);
    }
    if (name === 'board') {
      const gated = await gateUser(db, snowflake, interaction);
      if (!gated.ok) return gated.response;
      const { lines, hasPrev, hasNext } = await fetchBoardPage(db, 'ranked', 0);
      return messageResponse(
        boardScreen({
          scope: 'ranked',
          page: 0,
          lines,
          hasPrev,
          hasNext,
        }),
      );
    }
    return ephemeralText('Unknown command.');
  }

  // MESSAGE_COMPONENT
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id ?? '';
    const gated = await gateUser(db, snowflake, interaction);
    if (!gated.ok) return gated.response;
    const user = gated.user;

    if (customId === 'mode') {
      const mode = parseMode(interaction.data?.values?.[0]);
      return updateMessageResponse(
        idleRollScreen({
          mode,
          username: user.username!,
          tierLabel: tierLabel(user),
        }),
      );
    }

    if (customId === 'roll_home') {
      return updateMessageResponse(
        idleRollScreen({
          mode: 'free',
          username: user.username!,
          tierLabel: tierLabel(user),
        }),
      );
    }

    if (customId === 'board' || customId.startsWith('board:')) {
      let scope: 'ranked' | 'practice' | 'alltime' = 'ranked';
      let page = 0;
      if (customId.startsWith('board:')) {
        const parts = customId.split(':');
        if (
          parts[1] === 'practice' ||
          parts[1] === 'alltime' ||
          parts[1] === 'ranked'
        ) {
          scope = parts[1];
        }
        page = Math.max(0, Number(parts[2] ?? 0) || 0);
      }
      const { lines, hasPrev, hasNext } = await fetchBoardPage(db, scope, page);
      return updateMessageResponse(
        boardScreen({ scope, page, lines, hasPrev, hasNext }),
      );
    }

    if (customId === 'board_scope') {
      const scopeRaw = interaction.data?.values?.[0] ?? 'ranked';
      const scope =
        scopeRaw === 'practice' || scopeRaw === 'alltime' ? scopeRaw : 'ranked';
      const { lines, hasPrev, hasNext } = await fetchBoardPage(db, scope, 0);
      return updateMessageResponse(
        boardScreen({ scope, page: 0, lines, hasPrev, hasNext }),
      );
    }

    if (customId.startsWith('share:')) {
      const code = customId.slice('share:'.length);
      const url = `${SITE_ORIGIN}/s/${encodeURIComponent(user.username!)}/${encodeURIComponent(code)}`;
      return ephemeralText(`Share / Prove:\n${url}`);
    }

    if (customId === 'roll' || customId.startsWith('roll:')) {
      const mode = customId.startsWith('roll:')
        ? parseMode(customId.slice('roll:'.length))
        : 'free';
      return await handleRollClick(db, interaction, user, mode);
    }

    return ephemeralText('Unknown control.');
  }

  return ephemeralText('Unsupported interaction.');
}

/**
 * After mode select we rebuild idle with roll:{mode} — but initial idle uses "roll".
 * Patch idleRollScreen / resultScreen to use roll:{mode}.
 */
async function handleRollClick(
  db: Db,
  interaction: Interaction,
  user: DiscordLinkedUser,
  mode: DiscordMode,
): Promise<Record<string, unknown>> {
  const cd = await checkDiscordRollCooldown(db, discordUserId(interaction)!);
  if (!cd.ok) {
    return ephemeralText(`Slow down — try again in ${cd.retryAfterSec}s.`);
  }

  // Keep work inside the interaction request (<3s target) so Vercel does not
  // kill a fire-and-forget after ack. Skip the deferred Rolling… edit for reliability.
  try {
    const { roll, note } = await runRoll(db, user, mode);
    return updateMessageResponse(
      resultScreen({
        mode,
        username: user.username!,
        roll,
        note,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('roll failed', { err: msg });
    return ephemeralText(`${msg.slice(0, 500)}\n\nRun \`/roll\` again.`);
  }
}
