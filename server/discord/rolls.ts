/**
 * Discord Free (`source=discord`) + challenge rolls persisted server-side.
 */
import { and, eq, sql } from 'drizzle-orm';
import { buildPeriodSeed, challengeNumber } from '../../src/game/challenge.js';
import type { ChallengeKind } from '../../src/game/challenge.js';
import { evaluateBadges } from '../../src/game/badges/index.js';
import { makeShortCode, newRollId } from '../../src/game/ids.js';
import { percentileFromEP } from '../../src/game/percentile.js';
import { rarityFromEP } from '../../src/game/rarity.js';
import { assertValidRollNumber } from '../../src/game/rng.js';
import { sumEP } from '../../src/game/score.js';
import type { RollResult } from '../../src/game/types.js';
import type { Db } from '../db/index.js';
import { rolls } from '../db/schema.js';
import { createLogger } from '../logger.js';
import { processRollActivity } from '../rollActivity.js';
import { serverRollNumber } from '../rankedRoll.js';

const log = createLogger('discord-rolls');

function evaluateDiscordNumber(
  n: number,
  source: 'discord' | 'challenge',
  at: Date = new Date(),
  extra?: { challengeKey?: string },
): RollResult {
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
    source,
    ...(extra?.challengeKey ? { challengeKey: extra.challengeKey } : {}),
  };
}

async function persistRoll(
  db: Db,
  opts: {
    result: RollResult;
    userId: string;
    source: 'discord' | 'challenge';
    challengeKey: string | null;
  },
): Promise<void> {
  const rolledAt = new Date(opts.result.rolledAt);
  const now = new Date();
  const shortCode = opts.result.shortCode ?? null;

  await db.execute(sql`
    WITH inserted AS (
      INSERT INTO rolls (
        id, user_id, number, total_ep, rarity, percentile, badges_json,
        rolled_at, created_at, is_public, challenge_key, source, short_code
      ) VALUES (
        ${opts.result.id},
        ${opts.userId},
        ${opts.result.number},
        ${opts.result.totalEP},
        ${opts.result.rarity},
        ${opts.result.percentile},
        ${JSON.stringify(opts.result.badges ?? [])},
        ${rolledAt},
        ${now},
        true,
        ${opts.challengeKey},
        ${opts.source},
        ${shortCode}
      )
      RETURNING user_id, total_ep
    )
    INSERT INTO user_progress (
      user_id, lifetime_ep, lifetime_roll_count, journey_ep,
      collection_json, stats_json, settings_json, settings_sync_enabled, updated_at
    )
    SELECT user_id, total_ep, 1, 0, '[]', '{}', '{}', false, ${now}
    FROM inserted
    ON CONFLICT (user_id) DO UPDATE SET
      lifetime_ep = user_progress.lifetime_ep + EXCLUDED.lifetime_ep,
      lifetime_roll_count = user_progress.lifetime_roll_count + 1,
      updated_at = EXCLUDED.updated_at
  `);
}

async function afterActivity(
  db: Db,
  opts: {
    userId: string;
    username?: string | null;
    name?: string | null;
    result: RollResult;
  },
): Promise<void> {
  try {
    await processRollActivity(db, {
      userId: opts.userId,
      username: opts.username,
      name: opts.name,
      prevCollection: [],
      nextCollection: [],
      prevRollIds: new Set(),
      newRolls: [opts.result],
    });
  } catch (e) {
    log.warn('processRollActivity failed (non-fatal)', {
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Free-play Discord roll — honor-system, not Ranked crowns. */
export async function issueDiscordRoll(
  db: Db,
  opts: {
    userId: string;
    username?: string | null;
    name?: string | null;
  },
): Promise<RollResult> {
  const number = serverRollNumber();
  const result = evaluateDiscordNumber(number, 'discord');
  try {
    await persistRoll(db, {
      result,
      userId: opts.userId,
      source: 'discord',
      challengeKey: null,
    });
  } catch (firstErr) {
    log.warn('discord insert retry without short_code', {
      err: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    result.shortCode = undefined;
    await persistRoll(db, {
      result,
      userId: opts.userId,
      source: 'discord',
      challengeKey: null,
    });
  }
  await afterActivity(db, { ...opts, result });
  log.info('discord roll', {
    userId: opts.userId,
    id: result.id,
    number: result.number,
    totalEP: result.totalEP,
  });
  return result;
}

/** Daily/Weekly challenge roll — one per period per user. */
export async function issueDiscordChallengeRoll(
  db: Db,
  opts: {
    userId: string;
    username?: string | null;
    name?: string | null;
    kind: ChallengeKind;
  },
): Promise<{ roll: RollResult; reused: boolean }> {
  const info = buildPeriodSeed(opts.kind);
  const challengeKey = `${opts.kind}:${info.periodKey}`;

  const [existing] = await db
    .select({
      id: rolls.id,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      percentile: rolls.percentile,
      badgesJson: rolls.badgesJson,
      rolledAt: rolls.rolledAt,
      shortCode: rolls.shortCode,
      challengeKey: rolls.challengeKey,
      source: rolls.source,
    })
    .from(rolls)
    .where(
      and(eq(rolls.userId, opts.userId), eq(rolls.challengeKey, challengeKey)),
    )
    .limit(1);

  if (existing) {
    let badges: RollResult['badges'] = [];
    try {
      badges = JSON.parse(existing.badgesJson || '[]') as RollResult['badges'];
    } catch {
      badges = [];
    }
    return {
      reused: true,
      roll: {
        id: existing.id,
        shortCode: existing.shortCode ?? undefined,
        number: existing.number,
        badges,
        totalEP: existing.totalEp,
        rarity: existing.rarity as RollResult['rarity'],
        percentile: existing.percentile,
        rolledAt: existing.rolledAt.toISOString(),
        challengeKey: existing.challengeKey ?? challengeKey,
        source: 'challenge',
      },
    };
  }

  const n = await challengeNumber(info.seed, opts.userId);
  const result = evaluateDiscordNumber(n, 'challenge', new Date(), {
    challengeKey,
  });
  await persistRoll(db, {
    result,
    userId: opts.userId,
    source: 'challenge',
    challengeKey,
  });
  await afterActivity(db, { ...opts, result });
  log.info('discord challenge roll', {
    userId: opts.userId,
    kind: opts.kind,
    id: result.id,
    number: result.number,
  });
  return { roll: result, reused: false };
}
