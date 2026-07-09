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
import { rolls, user, userProgress } from './db/schema.js';
import { createLogger } from './logger.js';

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
 * Issue a ranked free-play roll: server RNG → evaluate → persist → crown side-effects.
 */
export async function issueRankedRoll(
  db: Db,
  opts: { userId: string },
): Promise<RollResult> {
  const number = serverRollNumber();
  const result = evaluateServerNumber(number, new Date());
  result.source = 'ranked';
  result.shortCode = makeServerShortCode(8);

  const rolledAt = new Date(result.rolledAt);
  const now = new Date();

  const baseValues = {
    id: result.id,
    userId: opts.userId,
    number: result.number,
    totalEp: result.totalEP,
    rarity: result.rarity,
    percentile: result.percentile,
    badgesJson: JSON.stringify(result.badges ?? []),
    rolledAt,
    createdAt: now,
    isPublic: true as const,
    challengeKey: null as string | null,
    source: 'ranked' as const,
  };

  try {
    await db.insert(rolls).values({
      ...baseValues,
      shortCode: result.shortCode ?? null,
    });
  } catch (firstErr) {
    // short_code unique collision — retry once without vanity code
    log.warn('ranked insert retry without short_code', {
      id: result.id,
      err: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    result.shortCode = undefined;
    await db.insert(rolls).values({
      ...baseValues,
      shortCode: null,
    });
  }

  // Bump aggregate progress (profile totals — ranked board uses roll sums)
  try {
    await db
      .insert(userProgress)
      .values({
        userId: opts.userId,
        lifetimeEp: result.totalEP,
        lifetimeRollCount: 1,
        journeyEp: 0,
        collectionJson: '[]',
        statsJson: '{}',
        settingsJson: '{}',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userProgress.userId,
        set: {
          lifetimeEp: sql`${userProgress.lifetimeEp} + ${result.totalEP}`,
          lifetimeRollCount: sql`${userProgress.lifetimeRollCount} + 1`,
          updatedAt: now,
        },
      });
  } catch (e) {
    // Non-fatal: roll row already written; client will merge history on sync
    log.error('userProgress bump failed (non-fatal)', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  // Crowns / overtake (lazy import so module load stays lighter)
  try {
    const { processRollActivity } = await import('./rollActivity.js');
    await processRollActivity(db, {
      userId: opts.userId,
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

export async function getUsername(
  db: Db,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.username?.trim().toLowerCase() || null;
}
