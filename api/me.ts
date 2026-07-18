import { eq } from 'drizzle-orm';
import {
  isAvatarUnlocked,
  isProfileAvatarId,
  normalizeProfileAvatar,
} from '../src/lib/profile-avatars.js';
import {
  isFrameUnlocked,
  normalizeProfileFrame,
} from '../src/lib/profile-frames.js';
import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { user } from '../server/db/schema.js';
import { getLinkedSocialAccounts } from '../server/linkedAccounts.js';
import { createLogger } from '../server/logger.js';
import {
  getEffectiveRankedTier,
  getEntitlementRow,
} from '../server/polar/entitlements.js';
import { LIMITS } from '../server/rateLimit.js';
import {
  getSettingsSyncEnabled,
  setSettingsSyncEnabled,
} from '../server/sync.js';
import { isValidUsername, normalizeUsername } from '../server/username.js';
import {
  holdFormerUsername,
  isUsernameAvailableFor,
  isUsernameChangeOnCooldown,
  normalizeDisplayName,
  usernameNextChangeAt,
} from '../server/usernameChange.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/me');

const ACCENTS = new Set([
  'teal',
  'violet',
  'amber',
  'rose',
  'sky',
  'emerald',
  'mono',
]);

const VANITY_SELECT = {
  name: user.name,
  username: user.username,
  usernameChangedAt: user.usernameChangedAt,
  profileAccent: user.profileAccent,
  profileBio: user.profileBio,
  profileFlair: user.profileFlair,
  profileAvatar: user.profileAvatar,
  profileFrame: user.profileFrame,
  profileShowCodex: user.profileShowCodex,
} as const;

async function getSession(request: Request) {
  const auth = createAuth();
  return auth.api.getSession({ headers: request.headers });
}

function nextChangeIso(changedAt: Date | null | undefined): string | null {
  const next = usernameNextChangeAt(changedAt);
  return next ? next.toISOString() : null;
}

export default defineHandler(async (request) => {
  log.info('request', { method: request.method });

  if (request.method === 'GET') {
    const session = await getSession(request);
    if (!session) {
      log.debug('no session');
      return Response.json({ user: null }, { status: 200 });
    }
    try {
      const db = createDb();
      const [row] = await db
        .select(VANITY_SELECT)
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);
      const linkedAccounts = await getLinkedSocialAccounts(db, session.user.id);
      const settingsSyncEnabled = await getSettingsSyncEnabled(
        db,
        session.user.id,
      );
      const rankedTier = await getEffectiveRankedTier(db, session.user.id);
      const entitlement = await getEntitlementRow(db, session.user.id);
      const hasPolarBilling = Boolean(
        entitlement?.polarCustomerId || entitlement?.polarSubscriptionId,
      );
      let profileAvatar = row?.profileAvatar ?? '';
      let profileFrame = normalizeProfileFrame(row?.profileFrame);
      if (profileAvatar && !isAvatarUnlocked(profileAvatar, rankedTier)) {
        profileAvatar = '';
      }
      if (!isFrameUnlocked(profileFrame, rankedTier)) {
        profileFrame = 'none';
      }
      return Response.json({
        user: {
          ...session.user,
          name: row?.name ?? session.user.name,
          username: row?.username ?? session.user.username,
          usernameChangedAt: row?.usernameChangedAt?.toISOString() ?? null,
          usernameNextChangeAt: nextChangeIso(row?.usernameChangedAt),
          profileAccent: row?.profileAccent ?? 'teal',
          profileBio: row?.profileBio ?? '',
          profileFlair: row?.profileFlair ?? '',
          profileAvatar,
          profileFrame,
          profileShowCodex: row?.profileShowCodex ?? true,
          rankedTier,
          hasPolarBilling,
        },
        settingsSyncEnabled,
        linkedAccounts,
        session: session.session,
      });
    } catch {
      return Response.json({
        user: session.user,
        settingsSyncEnabled: false,
        linkedAccounts: [],
        session: session.session,
      });
    }
  }

  if (request.method === 'PATCH') {
    const gate = await requireUser(request);
    if (!gate.ok) return gate.response;
    const me = gate.user;
    const db = createDb();
    const limited = await rateGuard(
      db,
      `user:${me.id}:me-patch`,
      LIMITS.mePatchPerMinute,
      60_000,
    );
    if (limited) return limited;

    const parsed = await readJson<{
      name?: string;
      username?: string;
      profileAccent?: string;
      profileBio?: string;
      profileFlair?: string;
      profileAvatar?: string;
      profileFrame?: string;
      profileShowCodex?: boolean;
      settingsSyncEnabled?: boolean;
    }>(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;
    const rankedTier = await getEffectiveRankedTier(db, me.id);

    let settingsSyncEnabledOut: boolean | undefined;
    if (body.settingsSyncEnabled !== undefined) {
      settingsSyncEnabledOut = await setSettingsSyncEnabled(
        db,
        me.id,
        Boolean(body.settingsSyncEnabled),
      );
    }

    const patch: {
      name?: string;
      username?: string;
      usernameChangedAt?: Date;
      profileAccent?: string;
      profileBio?: string;
      profileFlair?: string;
      profileAvatar?: string;
      profileFrame?: string;
      profileShowCodex?: boolean;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    let previousUsername: string | null = null;
    let usernameChanging = false;

    if (body.name !== undefined) {
      const displayName = normalizeDisplayName(body.name ?? '');
      if (!displayName) {
        return Response.json(
          {
            error: 'Display name must be 2–48 characters.',
          },
          { status: 400 },
        );
      }
      patch.name = displayName;
    }

    if (body.username !== undefined) {
      const username = normalizeUsername(body.username ?? '');
      log.info('username patch', { userId: me.id, username });
      const [current] = await db
        .select({
          username: user.username,
          usernameChangedAt: user.usernameChangedAt,
        })
        .from(user)
        .where(eq(user.id, me.id))
        .limit(1);
      if (
        !username ||
        !isValidUsername(username, { currentUsername: current?.username })
      ) {
        return Response.json(
          {
            error:
              'Username must be 3–24 chars: a-z, 0-9, _ (reserved names blocked)',
          },
          { status: 400 },
        );
      }

      const currentHandle = current?.username
        ? normalizeUsername(current.username)
        : '';
      if (currentHandle === username) {
        // Same-value re-save — no cooldown burn; leave patch.username unset
      } else {
        const isFirstClaim = !currentHandle;
        if (
          !isFirstClaim &&
          isUsernameChangeOnCooldown(current?.usernameChangedAt)
        ) {
          const next = usernameNextChangeAt(current?.usernameChangedAt);
          return Response.json(
            {
              error: next
                ? `You can change your username again on ${next.toUTCString()}.`
                : 'Username change is on cooldown (once every 7 days).',
              usernameNextChangeAt: next?.toISOString() ?? null,
            },
            { status: 429 },
          );
        }

        const available = await isUsernameAvailableFor(db, username, me.id);
        if (!available) {
          return Response.json(
            { error: 'Username taken or reserved' },
            { status: 409 },
          );
        }

        previousUsername = currentHandle || null;
        usernameChanging = true;
        patch.username = username;
        patch.usernameChangedAt = new Date();
      }
    }

    if (body.profileAccent !== undefined) {
      const a = body.profileAccent.trim().toLowerCase();
      if (!ACCENTS.has(a)) {
        return Response.json(
          {
            error:
              'Invalid accent. Use teal, violet, amber, rose, sky, emerald, mono.',
          },
          { status: 400 },
        );
      }
      patch.profileAccent = a;
    }

    if (body.profileBio !== undefined) {
      patch.profileBio = body.profileBio.trim().slice(0, 160);
    }

    if (body.profileFlair !== undefined) {
      patch.profileFlair = body.profileFlair.trim().slice(0, 48);
    }

    if (body.profileAvatar !== undefined) {
      const a = normalizeProfileAvatar(body.profileAvatar);
      if (a !== '' && !isProfileAvatarId(a)) {
        return Response.json(
          { error: 'Invalid profile picture selection.' },
          { status: 400 },
        );
      }
      if (a !== '' && !isAvatarUnlocked(a, rankedTier)) {
        return Response.json(
          {
            error:
              'That profile picture requires a Ranked Plus subscription at that tier or higher.',
          },
          { status: 403 },
        );
      }
      patch.profileAvatar = a;
    }

    if (body.profileFrame !== undefined) {
      const f = normalizeProfileFrame(body.profileFrame);
      if (!isFrameUnlocked(f, rankedTier)) {
        return Response.json(
          {
            error:
              'That profile frame requires a Ranked Plus subscription at that tier or higher.',
          },
          { status: 403 },
        );
      }
      patch.profileFrame = f;
    }

    if (body.profileShowCodex !== undefined) {
      patch.profileShowCodex = Boolean(body.profileShowCodex);
    }

    if (
      patch.name === undefined &&
      patch.username === undefined &&
      patch.profileAccent === undefined &&
      patch.profileBio === undefined &&
      patch.profileFlair === undefined &&
      patch.profileAvatar === undefined &&
      patch.profileFrame === undefined &&
      patch.profileShowCodex === undefined &&
      settingsSyncEnabledOut === undefined
    ) {
      // Same @username re-save (or empty patch) — return current identity
      if (body.username !== undefined) {
        const [row] = await db
          .select(VANITY_SELECT)
          .from(user)
          .where(eq(user.id, me.id))
          .limit(1);
        return Response.json({
          ok: true,
          name: row?.name,
          username: row?.username,
          usernameChangedAt: row?.usernameChangedAt?.toISOString() ?? null,
          usernameNextChangeAt: nextChangeIso(row?.usernameChangedAt),
          profileAccent: row?.profileAccent ?? 'teal',
          profileBio: row?.profileBio ?? '',
          profileFlair: row?.profileFlair ?? '',
          profileAvatar: row?.profileAvatar ?? '',
          profileFrame: normalizeProfileFrame(row?.profileFrame),
          profileShowCodex: row?.profileShowCodex ?? true,
          rankedTier,
          settingsSyncEnabled:
            settingsSyncEnabledOut ?? (await getSettingsSyncEnabled(db, me.id)),
        });
      }
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const hasVanityPatch =
      patch.name !== undefined ||
      patch.username !== undefined ||
      patch.profileAccent !== undefined ||
      patch.profileBio !== undefined ||
      patch.profileFlair !== undefined ||
      patch.profileAvatar !== undefined ||
      patch.profileFrame !== undefined ||
      patch.profileShowCodex !== undefined;

    if (hasVanityPatch) {
      try {
        await db.update(user).set(patch).where(eq(user.id, me.id));
      } catch {
        return Response.json(
          { error: 'Username taken or invalid' },
          { status: 409 },
        );
      }
      if (usernameChanging && previousUsername) {
        try {
          await holdFormerUsername(db, previousUsername, me.id);
        } catch (err) {
          log.warn('username hold failed', {
            userId: me.id,
            previousUsername,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const [row] = await db
      .select(VANITY_SELECT)
      .from(user)
      .where(eq(user.id, me.id))
      .limit(1);

    const settingsSyncEnabled =
      settingsSyncEnabledOut ?? (await getSettingsSyncEnabled(db, me.id));

    return Response.json({
      ok: true,
      name: row?.name,
      username: row?.username,
      usernameChangedAt: row?.usernameChangedAt?.toISOString() ?? null,
      usernameNextChangeAt: nextChangeIso(row?.usernameChangedAt),
      profileAccent: row?.profileAccent ?? 'teal',
      profileBio: row?.profileBio ?? '',
      profileFlair: row?.profileFlair ?? '',
      profileAvatar: row?.profileAvatar ?? '',
      profileFrame: normalizeProfileFrame(row?.profileFrame),
      profileShowCodex: row?.profileShowCodex ?? true,
      rankedTier,
      settingsSyncEnabled,
    });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});
