import { eq } from "drizzle-orm";
import { createAuth } from "../server/auth.js";
import { createDb } from "../server/db/index.js";
import { user } from "../server/db/schema.js";
import { getLinkedSocialAccounts } from "../server/linkedAccounts.js";
import { createLogger } from "../server/logger.js";
import { defineHandler } from "../server/vercel-adapter.js";

const log = createLogger("api/me");

const ACCENTS = new Set([
  "teal",
  "violet",
  "amber",
  "rose",
  "sky",
  "emerald",
  "mono",
]);

/** Keep in sync with src/lib/profile-avatars.ts */
const AVATARS = new Set([
  "dice-oracle",
  "void-eye",
  "mythic-flame",
  "anomaly-crystal",
  "prime-sigil",
  "star-hex",
  "neon-rune",
  "midnight-coin",
  "cosmic-spiral",
  "emerald-lattice",
  "amber-reliquary",
  "violet-orb",
]);

const VANITY_SELECT = {
  username: user.username,
  profileAccent: user.profileAccent,
  profileBio: user.profileBio,
  profileFlair: user.profileFlair,
  profileAvatar: user.profileAvatar,
  profileShowCodex: user.profileShowCodex,
} as const;

async function getSession(request: Request) {
  const auth = createAuth();
  return auth.api.getSession({ headers: request.headers });
}

export default defineHandler(async (request) => {
  log.info("request", { method: request.method });

  if (request.method === "GET") {
    const session = await getSession(request);
    if (!session) {
      log.debug("no session");
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
      return Response.json({
        user: {
          ...session.user,
          username:
            row?.username ?? (session.user as { username?: string }).username,
          profileAccent: row?.profileAccent ?? "teal",
          profileBio: row?.profileBio ?? "",
          profileFlair: row?.profileFlair ?? "",
          profileAvatar: row?.profileAvatar ?? "",
          profileShowCodex: row?.profileShowCodex ?? true,
        },
        linkedAccounts,
        session: session.session,
      });
    } catch {
      return Response.json({
        user: session.user,
        linkedAccounts: [],
        session: session.session,
      });
    }
  }

  if (request.method === "PATCH") {
    const session = await getSession(request);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await request.json()) as {
      username?: string;
      profileAccent?: string;
      profileBio?: string;
      profileFlair?: string;
      profileAvatar?: string;
      profileShowCodex?: boolean;
    };

    const db = createDb();
    const patch: {
      username?: string;
      profileAccent?: string;
      profileBio?: string;
      profileFlair?: string;
      profileAvatar?: string;
      profileShowCodex?: boolean;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (body.username !== undefined) {
      const username = body.username?.trim().toLowerCase();
      log.info("username patch", { userId: session.user.id, username });
      if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
        return Response.json(
          { error: "Username must be 3–24 chars: a-z, 0-9, _" },
          { status: 400 },
        );
      }
      patch.username = username;
    }

    if (body.profileAccent !== undefined) {
      const a = body.profileAccent.trim().toLowerCase();
      if (!ACCENTS.has(a)) {
        return Response.json(
          {
            error:
              "Invalid accent. Use teal, violet, amber, rose, sky, emerald, mono.",
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
      const a = body.profileAvatar.trim().toLowerCase();
      if (a !== "" && !AVATARS.has(a)) {
        return Response.json(
          { error: "Invalid profile picture selection." },
          { status: 400 },
        );
      }
      patch.profileAvatar = a;
    }

    if (body.profileShowCodex !== undefined) {
      patch.profileShowCodex = Boolean(body.profileShowCodex);
    }

    if (
      patch.username === undefined &&
      patch.profileAccent === undefined &&
      patch.profileBio === undefined &&
      patch.profileFlair === undefined &&
      patch.profileAvatar === undefined &&
      patch.profileShowCodex === undefined
    ) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
      await db.update(user).set(patch).where(eq(user.id, session.user.id));
    } catch {
      return Response.json(
        { error: "Username taken or invalid" },
        { status: 409 },
      );
    }

    const [row] = await db
      .select(VANITY_SELECT)
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    return Response.json({
      ok: true,
      username: row?.username,
      profileAccent: row?.profileAccent ?? "teal",
      profileBio: row?.profileBio ?? "",
      profileFlair: row?.profileFlair ?? "",
      profileAvatar: row?.profileAvatar ?? "",
      profileShowCodex: row?.profileShowCodex ?? true,
    });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
});
