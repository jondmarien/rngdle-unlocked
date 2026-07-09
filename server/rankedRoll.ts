import { randomInt } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { evaluateNumber } from '../src/game/evaluate.js';
import {
  CEILING_JACKPOT_ODDS,
  ROLL_MAX,
  ROLL_RANGE,
} from '../src/game/rng.js';
import type { RollResult } from '../src/game/types.js';
import type { Db } from './db/index.js';
import { rolls, user, userProgress } from './db/schema.js';
import { createLogger } from './logger.js';
import { processRollActivity } from './rollActivity.js';

const log = createLogger('ranked-roll');

/**
 * Unbiased server CSPRNG in 0..ROLL_MAX, plus the same Absolute Ceiling
 * jackpot lottery as client free play (1 in CEILING_JACKPOT_ODDS).
 */
export function serverRollNumber(): number {
  // Independent ultra-rare ceiling lottery
  if (randomInt(0, CEILING_JACKPOT_ODDS) === 0) {
    return ROLL_MAX;
  }
  // randomInt upper bound is exclusive → 0..ROLL_MAX inclusive
  return randomInt(0, ROLL_RANGE);
}

function makeShortCode(len = 8): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) {
    s += alphabet[randomInt(0, alphabet.length)]!;
  }
  return s;
}

/**
 * Issue a ranked free-play roll: server RNG → evaluate → persist → side effects.
 */
export async function issueRankedRoll(
  db: Db,
  opts: { userId: string },
): Promise<RollResult> {
  const number = serverRollNumber();
  const result = evaluateNumber(number, new Date());
  result.source = 'ranked';
  result.shortCode = makeShortCode(8);

  const rolledAt = new Date(result.rolledAt);
  const now = new Date();

  // Persist roll (unique short_code retry once)
  try {
    await db.insert(rolls).values({
      id: result.id,
      userId: opts.userId,
      number: result.number,
      totalEp: result.totalEP,
      rarity: result.rarity,
      percentile: result.percentile,
      badgesJson: JSON.stringify(result.badges),
      rolledAt,
      createdAt: now,
      isPublic: true,
      shortCode: result.shortCode ?? null,
      challengeKey: null,
      source: 'ranked',
    });
  } catch {
    result.shortCode = makeShortCode(8);
    await db.insert(rolls).values({
      id: result.id,
      userId: opts.userId,
      number: result.number,
      totalEp: result.totalEP,
      rarity: result.rarity,
      percentile: result.percentile,
      badgesJson: JSON.stringify(result.badges),
      rolledAt,
      createdAt: now,
      isPublic: true,
      shortCode: result.shortCode ?? null,
      challengeKey: null,
      source: 'ranked',
    });
  }

  // Bump aggregate progress (profile totals — leaderboard uses ranked sums)
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

  // Crowns / unlock notifs (collection merges still mostly client-driven;
  // crowns key off this new public ranked row).
  try {
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

  // Ensure source on returned payload
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
