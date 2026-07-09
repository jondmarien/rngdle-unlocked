import { createAuth } from "../server/auth.js";
import { createDb } from "../server/db/index.js";
import { createLogger } from "../server/logger.js";
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from "../server/rateLimit.js";
import { defineHandler } from "../server/vercel-adapter.js";

const log = createLogger("api/ranked-roll");

/** Allow cold path for badge catalog + DB write. */
export const config = {
  maxDuration: 30,
};

/**
 * POST /api/ranked-roll
 * Auth + public username required.
 * Server CSPRNG free-play roll that counts for leaderboard / community crowns.
 */
export default defineHandler(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let userIdForLog: string | null = null;
  try {
    const auth = createAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return Response.json(
        { error: "Sign in to play Ranked free play" },
        { status: 401 },
      );
    }
    const userId = session.user.id;
    userIdForLog = userId;

    const db = createDb();

    const rl = await checkRateLimit(
      db,
      `user:${userId}:ranked-roll`,
      LIMITS.rankedRollsPerHour,
      3_600_000,
    );
    if (isRateLimited(rl)) {
      log.warn("rate limited", { userId });
      return rateLimitedResponse(
        rl,
        "Ranked roll rate limit — try again later",
        true,
      );
    }

    // Lazy-load heavy game + roll logic so auth/rate-limit errors still work
    // if the scoring graph misbehaves.
    const { getUsername, issueRankedRoll } =
      await import("../server/rankedRoll.js");

    const username = await getUsername(db, userId);
    if (!username) {
      return Response.json(
        {
          error:
            "Claim a public @username on Account before Ranked free play (required for the board).",
          code: "username_required",
        },
        { status: 400 },
      );
    }

    const roll = await issueRankedRoll(db, { userId });
    return Response.json({ roll });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log.error("issue failed", { userId: userIdForLog, err: message, stack });
    return Response.json(
      {
        error: message || "Ranked roll failed",
        // Helpful in client devtools when deploy is broken
        detail: process.env.NODE_ENV === "development" ? stack : undefined,
      },
      { status: 500 },
    );
  }
});
