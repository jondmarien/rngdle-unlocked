/**
 * Rare+-gated Discord guild installs + allowlist checks.
 * Playing via user-install / DMs does not require a guild row.
 *
 * Ops can mint a bypass install URL (signed state flag) for a specific
 * user without Rare+ / admin override — see scripts/mint-discord-guild-install.mjs.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { discordGuildInstalls } from '../db/schema.js';
import { getEffectiveRankedTier } from '../polar/entitlements.js';
import { tierMeetsMin } from '../../src/lib/ranked-limits.js';
import { SITE_ORIGIN } from './identity.js';

const STATE_TTL_MS = 15 * 60 * 1000;
/** Ops-minted bypass links (friend / dogfood without Rare+). */
export const GRANT_STATE_TTL_MS = 24 * 60 * 60 * 1000;

/** Discord ApplicationIntegrationType.GUILD_INSTALL */
const GUILD_INSTALL_KEY = '0';
/** Discord ApplicationIntegrationType.USER_INSTALL */
const USER_INSTALL_KEY = '1';

export type DiscordInstallInteraction = {
  guild_id?: string | null;
  authorizing_integration_owners?: Record<string, string> | null;
};

export type DiscordInstallState = {
  userId: string;
  /** When true, callback skips Rare+ check (ops-minted grant). */
  bypassRare: boolean;
};

function installSecret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.ATTEST_SECRET ||
    'dev-only-discord-install-secret'
  );
}

function signState(payload: string): string {
  return createHmac('sha256', installSecret()).update(payload).digest('hex');
}

export function createDiscordInstallState(
  userId: string,
  opts?: { bypassRare?: boolean; now?: number; ttlMs?: number },
): string {
  const now = opts?.now ?? Date.now();
  const ttl = opts?.ttlMs ?? STATE_TTL_MS;
  const exp = String(now + ttl);
  const flag = opts?.bypassRare ? '1' : '0';
  const payload = `${userId}.${exp}.${flag}`;
  return `${payload}.${signState(payload)}`;
}

export function parseDiscordInstallState(
  state: string | null | undefined,
  now = Date.now(),
): ({ ok: true } & DiscordInstallState) | { ok: false; reason: string } {
  if (!state) return { ok: false, reason: 'missing_state' };
  const parts = state.split('.');

  // New: userId.exp.flag.sig
  // Legacy (v0.19.1): userId.exp.sig → treat as Rare+-required
  let userId: string;
  let expRaw: string;
  let flag: string;
  let sig: string;
  if (parts.length === 4) {
    [userId, expRaw, flag, sig] = parts;
  } else if (parts.length === 3) {
    [userId, expRaw, sig] = parts;
    flag = '0';
  } else {
    return { ok: false, reason: 'bad_state' };
  }

  if (!userId || !expRaw || !sig || (flag !== '0' && flag !== '1')) {
    return { ok: false, reason: 'bad_state' };
  }
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now) {
    return { ok: false, reason: 'expired_state' };
  }

  const payload =
    parts.length === 4 ? `${userId}.${expRaw}.${flag}` : `${userId}.${expRaw}`;
  const expected = signState(payload);
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad_sig' };
    }
  } catch {
    return { ok: false, reason: 'bad_sig' };
  }
  return { ok: true, userId, bypassRare: flag === '1' };
}

/**
 * True when this interaction is authorized via a guild install
 * (adding the app to a server). User-install / DM contexts are false.
 */
export function isGuildInstallContext(
  interaction: DiscordInstallInteraction,
): boolean {
  const owners = interaction.authorizing_integration_owners;
  if (owners && typeof owners === 'object') {
    if (GUILD_INSTALL_KEY in owners) return true;
    if (USER_INSTALL_KEY in owners) return false;
  }
  return Boolean(interaction.guild_id);
}

export async function userHasRarePlus(
  db: Db,
  userId: string,
): Promise<boolean> {
  const tier = await getEffectiveRankedTier(db, userId);
  return tierMeetsMin(tier, 'rare');
}

export async function isGuildInstallAllowed(
  db: Db,
  guildId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ guildId: discordGuildInstalls.guildId })
    .from(discordGuildInstalls)
    .where(eq(discordGuildInstalls.guildId, guildId))
    .limit(1);
  return Boolean(row);
}

export async function upsertGuildInstall(
  db: Db,
  guildId: string,
  installedByUserId: string,
): Promise<void> {
  await db
    .insert(discordGuildInstalls)
    .values({
      guildId,
      installedByUserId,
    })
    .onConflictDoUpdate({
      target: discordGuildInstalls.guildId,
      set: {
        installedByUserId,
        createdAt: new Date(),
      },
    });
}

export function discordInstallAuthorizeUrl(state: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error('DISCORD_CLIENT_ID is not set');
  }
  const redirectUri = `${SITE_ORIGIN}/api/discord/install/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'applications.commands',
    redirect_uri: redirectUri,
    state,
    // Prompt guild picker when installing to a server
    integration_type: '0',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export function plusRedirect(query: string): Response {
  return Response.redirect(`${SITE_ORIGIN}/plus?${query}`, 302);
}
