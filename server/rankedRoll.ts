import { randomInt } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { evaluateBadges } from '../src/game/badges/index.js';
import { makeShortCode, newRollId } from '../src/game/ids.js';
import { percentileFromEP } from '../src/game/percentile.js';
import { rarityFromEP } from '../src/game/rarity.js';
import {
  assertValidRollNumber,
  CEILING_JACKPOT_ODDS,
  ROLL_MAX,
  ROLL_RANGE,
} from '../src/game/rng.js';
import { sumEP } from '../src/game/score.js';
import type { RollResult } from '../src/game/types.js';
import type { Db } from './db/index.js';
import { user } from './db/schema.js';
import { createLogger } from './logger.js';
import { processRollActivity } from './rollActivity.js';

const log = createLogger('ranked-roll');

/**
 * Unbiased server CSPRNG in 0..ROLL_MAX, plus Absolute Ceiling jackpot
 * (1 in CEILING_JACKPOT_ODDS) — same idea as client free play.
 */
export function serverRollNumber(): number {
  if (randomInt(0, CEILING_JACKPOT_ODDS) === 0) {
    return ROLL_MAX;
  }
  return randomInt(0, ROLL_RANGE);
}

function makeServerShortCode(len = 8): string {
  const alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += alphabet[randomInt(0, alphabet.length)]!;
  }
  return s;
}

/** Server-side evaluate (same scoring as client free play). */
function evaluateServerNumber(n: number, at: Date = new Date()): RollResult {
  assertValidRollNumber(n);
  const badges = evaluateBadges(n);
  const totalEP = sumEP(badges);
  return {
    id: newRollId(),
    shortCode: makeShortCode(8),
    number: n,
    badges,
    totalEP,
    rarity: rarityFromEP(totalEP),
    percentile: percentileFromEP(totalEP),
    rolledAt: at.toISOString(),
    source: 'ranked',
  };
}

/**
 * Single-statement persist: INSERT rolls RETURNING → UPSERT user_progress.
 * Prefer over db.batch — one neon-http round-trip / one Postgres statement.
 */
async function persistRankedRollAndProgress(
  db: Db,
  opts: {
    id: string;
    userId: string;
    number: number;
    totalEp: number;
    rarity: string;
    percentile: number;
    badgesJson: string;
    rolledAt: Date;
    createdAt: Date;
    shortCode: string | null;
  },
): Promise<void> {
  await db.execute(sql`
    WITH inserted AS (
      INSERT INTO rolls (
        id,
        user_id,
        number,
        total_ep,
        rarity,
        percentile,
        badges_json,
        rolled_at,
        created_at,
        is_public,
        challenge_key,
        source,
        short_code
      ) VALUES (
        ${opts.id},
        ${opts.userId},
        ${opts.number},
        ${opts.totalEp},
        ${opts.rarity},
        ${opts.percentile},
        ${opts.badgesJson},
        ${opts.rolledAt},
        ${opts.createdAt},
        true,
        null,
        'ranked',
        ${opts.shortCode}
      )
      RETURNING user_id, total_ep
    )
    INSERT INTO user_progress (
      user_id,
      lifetime_ep,
      lifetime_roll_count,
      journey_ep,
      collection_json,
      stats_json,
      settings_json,
      settings_sync_enabled,
      updated_at
    )
    SELECT
      user_id,
      total_ep,
      1,
      0,
      '[]',
      '{}',
      '{}',
      false,
      ${opts.createdAt}
    FROM inserted
    ON CONFLICT (user_id) DO UPDATE SET
      lifetime_ep = user_progress.lifetime_ep + EXCLUDED.lifetime_ep,
      lifetime_roll_count = user_progress.lifetime_roll_count + 1,
      updated_at = EXCLUDED.updated_at
  `);
}

/**
 * Issue a ranked free-play roll: server RNG → evaluate → persist → crown side-effects.
 * Pass username/name from the handler to skip a duplicate user SELECT in roll activity.
 */
export async function issueRankedRoll(
  db: Db,
  opts: {
    userId: string;
    username?: string | null;
    name?: string | null;
  },
): Promise<RollResult> {
  const number = serverRollNumber();
  const result = evaluateServerNumber(number, new Date());
  result.source = 'ranked';
  result.shortCode = makeServerShortCode(8);

  const rolledAt = new Date(result.rolledAt);
  const now = new Date();

  const persistArgs = {
    id: result.id,
    userId: opts.userId,
    number: result.number,
    totalEp: result.totalEP,
    rarity: result.rarity,
    percentile: result.percentile,
    badgesJson: JSON.stringify(result.badges ?? []),
    rolledAt,
    createdAt: now,
    shortCode: result.shortCode ?? null,
  };

  try {
    await persistRankedRollAndProgress(db, persistArgs);
  } catch (firstErr) {
    // short_code unique collision — retry once without vanity code
    log.warn('ranked insert retry without short_code', {
      id: result.id,
      err: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    result.shortCode = undefined;
    await persistRankedRollAndProgress(db, {
      ...persistArgs,
      shortCode: null,
    });
  }

  // Crowns / overtake — non-fatal if activity side-effects fail
  try {
    await processRollActivity(db, {
      userId: opts.userId,
      username: opts.username,
      name: opts.name,
      prevCollection: [],
      nextCollection: [],
      prevRollIds: new Set(),
      newRolls: [result],
    });
  } catch (e) {
    log.error('processRollActivity after ranked roll failed (non-fatal)', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  result.source = 'ranked';
  log.info('issued', {
    userId: opts.userId,
    id: result.id,
    number: result.number,
    totalEP: result.totalEP,
    rarity: result.rarity,
  });
  return result;
}

/** Public @username for Ranked / Arcade gates (null if unset). */
export async function getUsername(
  db: Db,
  userId: string,
): Promise<string | null> {
  const identity = await getPublicIdentity(db, userId);
  return identity?.username ?? null;
}

/** Username + display name in one SELECT (Ranked path pass-through). */
export async function getPublicIdentity(
  db: Db,
  userId: string,
): Promise<{ username: string; name: string } | null> {
  const [row] = await db
    .select({ username: user.username, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const username = row?.username?.trim().toLowerCase() || null;
  if (!username) return null;
  return { username, name: row?.name?.trim() || username };
}
