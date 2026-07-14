/**
 * Arcade Mode — server-authoritative run loop (Digits, upgrades, bust/cash-out).
 * Reuses serverRollNumber + evaluateBadges; never writes to `rolls` / EP boards.
 */

import { randomInt } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { awardDigits } from '../src/game/arcade/digits.js';
import {
  ACTIVE_COOLDOWNS,
  CURRENCY_SURGE_ROLLS,
  DON_SUCCESS_MIN,
  RARITY_LOCK_ATTEMPTS,
  RARITY_LOCK_MIN,
} from '../src/game/arcade/economy.js';
import {
  defaultUnlockedUpgrades,
  evaluateMetaUnlocks,
} from '../src/game/arcade/meta.js';
import { buildShopOffers, type ShopOffer } from '../src/game/arcade/shop.js';
import {
  ARCADE_UPGRADES,
  isArcadeUpgradeId,
  type ArcadeUpgradeId,
} from '../src/game/arcade/upgrades.js';
import { evaluateBadges } from '../src/game/badges/index.js';
import { newRollId } from '../src/game/ids.js';
import { percentileFromEP } from '../src/game/percentile.js';
import { rarityFromEP, rarityRank } from '../src/game/rarity.js';
import { assertValidRollNumber } from '../src/game/rng.js';
import { sumEP } from '../src/game/score.js';
import type { BadgeHit, RarityTier } from '../src/game/types.js';
import type { Db } from './db/index.js';
import { arcadeMeta, arcadeRunRolls, arcadeRuns } from './db/schema.js';
import { createLogger } from './logger.js';
import { serverRollNumber } from './rankedRoll.js';

const log = createLogger('arcade');

export type RunStatus = 'active' | 'cashed' | 'busted';

export type PendingActive = {
  donArmed?: boolean;
  rarityLockArmed?: boolean;
  /** After bonus_spin: next roll skips regenerating shop. */
  skipShopOnce?: boolean;
};

export type CooldownMap = Partial<Record<ArcadeUpgradeId, number>>;

export type ArcadeRunPublic = {
  id: string;
  status: RunStatus;
  digits: number;
  peakDigits: number;
  rollCount: number;
  comboStreak: number;
  ownedUpgrades: ArcadeUpgradeId[];
  cooldowns: CooldownMap;
  surgeRollsRemaining: number;
  pending: PendingActive;
  shopOffers: ShopOffer[];
  runScore: number | null;
  startedAt: string;
  endedAt: string | null;
};

export type ArcadeMetaPublic = {
  unlockedUpgrades: ArcadeUpgradeId[];
  totalRunsCompleted: number;
  bestRunScore: number;
  lifetimeDigitsCashed: number;
  newlyUnlocked?: ArcadeUpgradeId[];
};

export type ArcadeRollPublic = {
  id: string;
  number: number;
  totalEP: number;
  rarity: RarityTier;
  badges: BadgeHit[];
  digitsAwarded: number;
  percentile: number;
  rolledAt: string;
};

type RunRow = typeof arcadeRuns.$inferSelect;

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseOwned(raw: string): ArcadeUpgradeId[] {
  const arr = parseJson<unknown[]>(raw, []);
  return arr.filter(
    (x): x is ArcadeUpgradeId => typeof x === 'string' && isArcadeUpgradeId(x),
  );
}

function parseUnlocked(raw: string): ArcadeUpgradeId[] {
  const arr = parseOwned(raw);
  return arr.length > 0 ? arr : defaultUnlockedUpgrades();
}

function parseCooldowns(raw: string): CooldownMap {
  const obj = parseJson<Record<string, number>>(raw, {});
  const out: CooldownMap = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isArcadeUpgradeId(k) && typeof v === 'number' && v > 0) {
      out[k] = Math.floor(v);
    }
  }
  return out;
}

function parsePending(raw: string): PendingActive {
  return parseJson<PendingActive>(raw, {});
}

function parseShop(raw: string): ShopOffer[] {
  const arr = parseJson<ShopOffer[]>(raw, []);
  return arr.filter(
    (o) =>
      o &&
      typeof o === 'object' &&
      isArcadeUpgradeId(o.upgradeId) &&
      typeof o.price === 'number',
  );
}

function runToPublic(row: RunRow): ArcadeRunPublic {
  return {
    id: row.id,
    status: row.status as RunStatus,
    digits: row.digits,
    peakDigits: row.peakDigits,
    rollCount: row.rollCount,
    comboStreak: row.comboStreak,
    ownedUpgrades: parseOwned(row.ownedUpgradesJson),
    cooldowns: parseCooldowns(row.cooldownsJson),
    surgeRollsRemaining: row.surgeRollsRemaining,
    pending: parsePending(row.pendingActiveJson),
    shopOffers: parseShop(row.shopOfferJson),
    runScore: row.runScore,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
  };
}

function secureRandom(): number {
  return randomInt(0, 1_000_000_000) / 1_000_000_000;
}

function evaluateArcadeNumber(n: number, at: Date = new Date()) {
  assertValidRollNumber(n);
  const badges = evaluateBadges(n);
  const totalEP = sumEP(badges);
  const rarity = rarityFromEP(totalEP);
  return {
    id: newRollId(),
    number: n,
    badges,
    totalEP,
    rarity,
    percentile: percentileFromEP(totalEP),
    rolledAt: at.toISOString(),
  };
}

function rollWithOptionalRarityLock(armed: boolean) {
  let best = evaluateArcadeNumber(serverRollNumber());
  if (!armed) return best;
  const minRank = rarityRank(RARITY_LOCK_MIN);
  for (let i = 0; i < RARITY_LOCK_ATTEMPTS - 1; i++) {
    if (rarityRank(best.rarity) >= minRank) break;
    const next = evaluateArcadeNumber(serverRollNumber());
    if (rarityRank(next.rarity) > rarityRank(best.rarity)) {
      best = next;
    } else if (
      rarityRank(next.rarity) === rarityRank(best.rarity) &&
      next.totalEP > best.totalEP
    ) {
      best = next;
    }
  }
  return best;
}

function tickCooldowns(cds: CooldownMap): CooldownMap {
  const next: CooldownMap = {};
  for (const [k, v] of Object.entries(cds)) {
    if (!isArcadeUpgradeId(k) || typeof v !== 'number') continue;
    const n = v - 1;
    if (n > 0) next[k] = n;
  }
  return next;
}

function setCooldown(cds: CooldownMap, id: ArcadeUpgradeId): CooldownMap {
  const turns = ACTIVE_COOLDOWNS[id as keyof typeof ACTIVE_COOLDOWNS];
  if (!turns) return cds;
  return { ...cds, [id]: turns };
}

async function ensureMeta(db: Db, userId: string) {
  const [existing] = await db
    .select()
    .from(arcadeMeta)
    .where(eq(arcadeMeta.userId, userId))
    .limit(1);
  if (existing) {
    return {
      ...existing,
      unlocked: parseUnlocked(existing.unlockedUpgradeIds),
    };
  }
  const unlocked = defaultUnlockedUpgrades();
  await db.insert(arcadeMeta).values({
    userId,
    unlockedUpgradeIds: JSON.stringify(unlocked),
    totalRunsCompleted: 0,
    bestRunScore: 0,
    lifetimeDigitsCashed: 0,
    updatedAt: new Date(),
  });
  const [row] = await db
    .select()
    .from(arcadeMeta)
    .where(eq(arcadeMeta.userId, userId))
    .limit(1);
  return { ...row!, unlocked };
}

function metaToPublic(
  row: typeof arcadeMeta.$inferSelect,
  unlocked: ArcadeUpgradeId[],
  newlyUnlocked?: ArcadeUpgradeId[],
): ArcadeMetaPublic {
  return {
    unlockedUpgrades: unlocked,
    totalRunsCompleted: row.totalRunsCompleted,
    bestRunScore: row.bestRunScore,
    lifetimeDigitsCashed: row.lifetimeDigitsCashed,
    newlyUnlocked,
  };
}

export async function getArcadeState(
  db: Db,
  userId: string,
): Promise<{ meta: ArcadeMetaPublic; activeRun: ArcadeRunPublic | null }> {
  const metaRow = await ensureMeta(db, userId);
  const [active] = await db
    .select()
    .from(arcadeRuns)
    .where(and(eq(arcadeRuns.userId, userId), eq(arcadeRuns.status, 'active')))
    .orderBy(desc(arcadeRuns.startedAt))
    .limit(1);
  return {
    meta: metaToPublic(metaRow, metaRow.unlocked),
    activeRun: active ? runToPublic(active) : null,
  };
}

export async function startArcadeRun(
  db: Db,
  userId: string,
): Promise<
  | { ok: true; run: ArcadeRunPublic; meta: ArcadeMetaPublic }
  | {
      ok: false;
      code: 'active_run_exists';
      message: string;
      run: ArcadeRunPublic;
    }
> {
  const metaRow = await ensureMeta(db, userId);
  const [existing] = await db
    .select()
    .from(arcadeRuns)
    .where(and(eq(arcadeRuns.userId, userId), eq(arcadeRuns.status, 'active')))
    .limit(1);
  if (existing) {
    return {
      ok: false,
      code: 'active_run_exists',
      message:
        'You already have a run in progress. Continue or cash out first.',
      run: runToPublic(existing),
    };
  }

  const shop = buildShopOffers(metaRow.unlocked, [], 0, secureRandom);
  const id = newRollId();
  const now = new Date();
  await db.insert(arcadeRuns).values({
    id,
    userId,
    status: 'active',
    digits: 0,
    peakDigits: 0,
    rollCount: 0,
    comboStreak: 0,
    ownedUpgradesJson: '[]',
    cooldownsJson: '{}',
    surgeRollsRemaining: 0,
    pendingActiveJson: '{}',
    shopOfferJson: JSON.stringify(shop),
    runScore: null,
    startedAt: now,
    endedAt: null,
  });
  const [row] = await db
    .select()
    .from(arcadeRuns)
    .where(eq(arcadeRuns.id, id))
    .limit(1);
  log.info('run:start', { userId, runId: id });
  return {
    ok: true,
    run: runToPublic(row!),
    meta: metaToPublic(metaRow, metaRow.unlocked),
  };
}

async function finishRun(
  db: Db,
  row: RunRow,
  opts: {
    status: 'cashed' | 'busted';
    runScore: number;
    digitsCashed: number;
  },
): Promise<{ run: ArcadeRunPublic; meta: ArcadeMetaPublic }> {
  const now = new Date();
  await db
    .update(arcadeRuns)
    .set({
      status: opts.status,
      digits: opts.status === 'busted' ? 0 : row.digits,
      runScore: opts.runScore,
      endedAt: now,
      shopOfferJson: '[]',
      pendingActiveJson: '{}',
    })
    .where(eq(arcadeRuns.id, row.id));

  const metaRow = await ensureMeta(db, row.userId);
  const totalRuns = metaRow.totalRunsCompleted + 1;
  const bestRunScore = Math.max(metaRow.bestRunScore, opts.runScore);
  const lifetimeDigitsCashed =
    metaRow.lifetimeDigitsCashed + Math.max(0, opts.digitsCashed);

  const { unlocked, newlyUnlocked } = evaluateMetaUnlocks({
    unlocked: metaRow.unlocked,
    totalRunsCompleted: totalRuns,
    bestRunScore,
  });

  await db
    .update(arcadeMeta)
    .set({
      unlockedUpgradeIds: JSON.stringify(unlocked),
      totalRunsCompleted: totalRuns,
      bestRunScore,
      lifetimeDigitsCashed,
      updatedAt: now,
    })
    .where(eq(arcadeMeta.userId, row.userId));

  const [updated] = await db
    .select()
    .from(arcadeRuns)
    .where(eq(arcadeRuns.id, row.id))
    .limit(1);
  const [metaUpdated] = await db
    .select()
    .from(arcadeMeta)
    .where(eq(arcadeMeta.userId, row.userId))
    .limit(1);

  log.info('run:end', {
    userId: row.userId,
    runId: row.id,
    status: opts.status,
    runScore: opts.runScore,
  });

  return {
    run: runToPublic(updated!),
    meta: metaToPublic(metaUpdated!, unlocked, newlyUnlocked),
  };
}

async function requireActiveRun(
  db: Db,
  userId: string,
): Promise<{ ok: true; row: RunRow } | { ok: false; response: Response }> {
  const [row] = await db
    .select()
    .from(arcadeRuns)
    .where(and(eq(arcadeRuns.userId, userId), eq(arcadeRuns.status, 'active')))
    .limit(1);
  if (!row) {
    return {
      ok: false,
      response: Response.json(
        { error: 'No active Arcade run', code: 'no_active_run' },
        { status: 404 },
      ),
    };
  }
  return { ok: true, row };
}

export async function cashOutArcadeRun(
  db: Db,
  userId: string,
): Promise<
  | { ok: true; run: ArcadeRunPublic; meta: ArcadeMetaPublic }
  | { ok: false; response: Response }
> {
  const gate = await requireActiveRun(db, userId);
  if (!gate.ok) return gate;
  const row = gate.row;
  const score = row.digits;
  const finished = await finishRun(db, row, {
    status: 'cashed',
    runScore: score,
    digitsCashed: row.digits,
  });
  return { ok: true, ...finished };
}

export async function abandonArcadeRun(
  db: Db,
  userId: string,
): Promise<
  | { ok: true; run: ArcadeRunPublic; meta: ArcadeMetaPublic }
  | { ok: false; response: Response }
> {
  const gate = await requireActiveRun(db, userId);
  if (!gate.ok) return gate;
  const row = gate.row;
  const peak = Math.max(row.peakDigits, row.digits);
  const finished = await finishRun(
    db,
    { ...row, digits: 0 },
    {
      status: 'busted',
      runScore: peak,
      digitsCashed: 0,
    },
  );
  return { ok: true, ...finished };
}

export async function buyArcadeUpgrade(
  db: Db,
  userId: string,
  upgradeIdRaw: string,
): Promise<
  { ok: true; run: ArcadeRunPublic } | { ok: false; response: Response }
> {
  if (!isArcadeUpgradeId(upgradeIdRaw)) {
    return {
      ok: false,
      response: Response.json({ error: 'Unknown upgrade' }, { status: 400 }),
    };
  }
  const upgradeId = upgradeIdRaw;
  const gate = await requireActiveRun(db, userId);
  if (!gate.ok) return gate;
  const row = gate.row;
  const owned = parseOwned(row.ownedUpgradesJson);
  if (owned.includes(upgradeId)) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Already owned', code: 'already_owned' },
        { status: 400 },
      ),
    };
  }
  const offers = parseShop(row.shopOfferJson);
  const offer = offers.find((o) => o.upgradeId === upgradeId);
  if (!offer) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Upgrade not in current shop offer', code: 'not_in_shop' },
        { status: 400 },
      ),
    };
  }
  if (row.digits < offer.price) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Not enough Digits', code: 'insufficient_digits' },
        { status: 400 },
      ),
    };
  }

  const nextOwned = [...owned, upgradeId];
  const nextOffers = offers.filter((o) => o.upgradeId !== upgradeId);
  const nextDigits = row.digits - offer.price;

  await db
    .update(arcadeRuns)
    .set({
      digits: nextDigits,
      ownedUpgradesJson: JSON.stringify(nextOwned),
      shopOfferJson: JSON.stringify(nextOffers),
    })
    .where(eq(arcadeRuns.id, row.id));

  const [updated] = await db
    .select()
    .from(arcadeRuns)
    .where(eq(arcadeRuns.id, row.id))
    .limit(1);
  return { ok: true, run: runToPublic(updated!) };
}

export async function armArcadeActive(
  db: Db,
  userId: string,
  upgradeIdRaw: string,
): Promise<
  { ok: true; run: ArcadeRunPublic } | { ok: false; response: Response }
> {
  if (!isArcadeUpgradeId(upgradeIdRaw)) {
    return {
      ok: false,
      response: Response.json({ error: 'Unknown upgrade' }, { status: 400 }),
    };
  }
  const upgradeId = upgradeIdRaw;
  const def = ARCADE_UPGRADES[upgradeId];
  if (def.type !== 'active') {
    return {
      ok: false,
      response: Response.json(
        { error: 'Not an active upgrade', code: 'not_active' },
        { status: 400 },
      ),
    };
  }

  const gate = await requireActiveRun(db, userId);
  if (!gate.ok) return gate;
  const row = gate.row;
  const owned = parseOwned(row.ownedUpgradesJson);
  if (!owned.includes(upgradeId)) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Upgrade not owned', code: 'not_owned' },
        { status: 400 },
      ),
    };
  }
  const cds = parseCooldowns(row.cooldownsJson);
  if ((cds[upgradeId] ?? 0) > 0) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Upgrade on cooldown', code: 'on_cooldown' },
        { status: 400 },
      ),
    };
  }

  const pending = parsePending(row.pendingActiveJson);
  let surge = row.surgeRollsRemaining;
  let nextCds = { ...cds };
  let skipShopOnce = pending.skipShopOnce;

  if (upgradeId === 'double_or_nothing') {
    pending.donArmed = true;
    nextCds = setCooldown(nextCds, 'double_or_nothing');
  } else if (upgradeId === 'rarity_lock') {
    pending.rarityLockArmed = true;
    nextCds = setCooldown(nextCds, 'rarity_lock');
  } else if (upgradeId === 'currency_surge') {
    surge = CURRENCY_SURGE_ROLLS;
    nextCds = setCooldown(nextCds, 'currency_surge');
  } else if (upgradeId === 'bonus_spin') {
    skipShopOnce = true;
    pending.skipShopOnce = true;
    nextCds = setCooldown(nextCds, 'bonus_spin');
  } else if (upgradeId === 'reroll') {
    // Reroll is applied during / after a roll via processArcadeRoll flag
    return {
      ok: false,
      response: Response.json(
        {
          error: 'Use reroll on the roll action (POST roll with useReroll)',
          code: 'use_roll_reroll',
        },
        { status: 400 },
      ),
    };
  } else {
    return {
      ok: false,
      response: Response.json({ error: 'Unhandled active' }, { status: 400 }),
    };
  }

  await db
    .update(arcadeRuns)
    .set({
      pendingActiveJson: JSON.stringify({ ...pending, skipShopOnce }),
      cooldownsJson: JSON.stringify(nextCds),
      surgeRollsRemaining: surge,
    })
    .where(eq(arcadeRuns.id, row.id));

  const [updated] = await db
    .select()
    .from(arcadeRuns)
    .where(eq(arcadeRuns.id, row.id))
    .limit(1);
  return { ok: true, run: runToPublic(updated!) };
}

/** Allowed Arcade multi-roll multipliers (Home Free/Ranked never use these). */
export const ARCADE_ROLL_COUNTS = [1, 2, 5, 10, 15] as const;
export type ArcadeRollCount = (typeof ARCADE_ROLL_COUNTS)[number];

export function isArcadeRollCount(n: number): n is ArcadeRollCount {
  return (ARCADE_ROLL_COUNTS as readonly number[]).includes(n);
}

type ArcadeRollOk = {
  ok: true;
  run: ArcadeRunPublic;
  meta: ArcadeMetaPublic;
  roll: ArcadeRollPublic;
  rolls: ArcadeRollPublic[];
  busted: boolean;
  donResult?: 'win' | 'lose';
};

async function processArcadeRollOnce(
  db: Db,
  userId: string,
  opts: {
    useReroll?: boolean;
    /** Keep existing shop (multi-roll intermediates). */
    forceSkipShop?: boolean;
  } = {},
): Promise<ArcadeRollOk | { ok: false; response: Response }> {
  const gate = await requireActiveRun(db, userId);
  if (!gate.ok) return gate;
  const row = gate.row;
  const metaRow = await ensureMeta(db, userId);
  const owned = parseOwned(row.ownedUpgradesJson);
  let cds = parseCooldowns(row.cooldownsJson);
  let pending = parsePending(row.pendingActiveJson);

  if (opts.useReroll) {
    if (!owned.includes('reroll')) {
      return {
        ok: false,
        response: Response.json(
          { error: 'Reroll not owned', code: 'not_owned' },
          { status: 400 },
        ),
      };
    }
    if ((cds.reroll ?? 0) > 0) {
      return {
        ok: false,
        response: Response.json(
          { error: 'Reroll on cooldown', code: 'on_cooldown' },
          { status: 400 },
        ),
      };
    }
  }

  const rarityLockArmed = Boolean(pending.rarityLockArmed);
  const donArmed = Boolean(pending.donArmed);
  const surgeActive = row.surgeRollsRemaining > 0;

  let evaluated = rollWithOptionalRarityLock(rarityLockArmed);

  // Optional immediate reroll of this outcome (extra server roll)
  if (opts.useReroll) {
    evaluated = rollWithOptionalRarityLock(false);
    cds = setCooldown(cds, 'reroll');
  }

  const award = awardDigits({
    rarity: evaluated.rarity,
    totalEP: evaluated.totalEP,
    badgeCount: evaluated.badges.length,
    owned,
    comboStreakBefore: row.comboStreak,
    surgeActive,
  });

  let digits = row.digits + award.finalDigits;
  let peak = Math.max(row.peakDigits, digits);
  let donResult: 'win' | 'lose' | undefined;
  let busted = false;

  if (donArmed) {
    const success = rarityRank(evaluated.rarity) >= rarityRank(DON_SUCCESS_MIN);
    if (success) {
      digits = digits * 2;
      peak = Math.max(peak, digits);
      donResult = 'win';
    } else {
      donResult = 'lose';
      busted = true;
      peak = Math.max(row.peakDigits, row.digits, digits);
    }
  }

  // Clear one-shot pending arms
  pending = {
    ...pending,
    donArmed: false,
    rarityLockArmed: false,
  };

  const surgeRemaining = Math.max(
    0,
    row.surgeRollsRemaining - (surgeActive ? 1 : 0),
  );
  cds = tickCooldowns(cds);
  const rollCount = row.rollCount + 1;
  const skipShop = Boolean(pending.skipShopOnce) || Boolean(opts.forceSkipShop);
  pending.skipShopOnce = false;

  const shop = skipShop
    ? parseShop(row.shopOfferJson)
    : buildShopOffers(metaRow.unlocked, owned, rollCount, secureRandom);

  await db.insert(arcadeRunRolls).values({
    id: evaluated.id,
    runId: row.id,
    userId,
    number: evaluated.number,
    totalEp: evaluated.totalEP,
    rarity: evaluated.rarity,
    badgesJson: JSON.stringify(evaluated.badges),
    digitsAwarded: busted ? 0 : award.finalDigits,
    rolledAt: new Date(evaluated.rolledAt),
  });

  const rollPublic: ArcadeRollPublic = {
    id: evaluated.id,
    number: evaluated.number,
    totalEP: evaluated.totalEP,
    rarity: evaluated.rarity,
    badges: evaluated.badges,
    digitsAwarded: busted ? 0 : award.finalDigits,
    percentile: evaluated.percentile,
    rolledAt: evaluated.rolledAt,
  };

  if (busted) {
    await db
      .update(arcadeRuns)
      .set({
        digits: 0,
        peakDigits: peak,
        rollCount,
        comboStreak: award.comboStreakAfter,
        cooldownsJson: JSON.stringify(cds),
        surgeRollsRemaining: 0,
        pendingActiveJson: '{}',
        shopOfferJson: '[]',
      })
      .where(eq(arcadeRuns.id, row.id));

    const [fresh] = await db
      .select()
      .from(arcadeRuns)
      .where(eq(arcadeRuns.id, row.id))
      .limit(1);
    const finished = await finishRun(db, fresh!, {
      status: 'busted',
      runScore: peak,
      digitsCashed: 0,
    });
    return {
      ok: true,
      run: finished.run,
      meta: finished.meta,
      roll: rollPublic,
      rolls: [rollPublic],
      busted: true,
      donResult,
    };
  }

  await db
    .update(arcadeRuns)
    .set({
      digits,
      peakDigits: peak,
      rollCount,
      comboStreak: award.comboStreakAfter,
      cooldownsJson: JSON.stringify(cds),
      surgeRollsRemaining: surgeRemaining,
      pendingActiveJson: JSON.stringify(pending),
      shopOfferJson: JSON.stringify(shop),
    })
    .where(eq(arcadeRuns.id, row.id));

  const [updated] = await db
    .select()
    .from(arcadeRuns)
    .where(eq(arcadeRuns.id, row.id))
    .limit(1);

  log.info('run:roll', {
    userId,
    runId: row.id,
    number: evaluated.number,
    rarity: evaluated.rarity,
    digitsAwarded: award.finalDigits,
    digits,
  });

  return {
    ok: true,
    run: runToPublic(updated!),
    meta: metaToPublic(metaRow, metaRow.unlocked),
    roll: rollPublic,
    rolls: [rollPublic],
    busted: false,
    donResult,
  };
}

/**
 * Arcade roll — optional `count` ∈ {1,2,5,10,15} advances Digits N steps.
 * Stops early on bust. Shop refreshes only after the last non-bust step.
 */
export async function processArcadeRoll(
  db: Db,
  userId: string,
  opts: { useReroll?: boolean; count?: number } = {},
): Promise<ArcadeRollOk | { ok: false; response: Response }> {
  const count = opts.count ?? 1;
  if (!isArcadeRollCount(count)) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'Invalid roll count (use 1, 2, 5, 10, or 15)',
          code: 'invalid_count',
        },
        { status: 400 },
      ),
    };
  }
  if (opts.useReroll && count !== 1) {
    return {
      ok: false,
      response: Response.json(
        {
          error: 'Reroll only works with Roll ×1',
          code: 'reroll_requires_single',
        },
        { status: 400 },
      ),
    };
  }

  if (count === 1) {
    return processArcadeRollOnce(db, userId, { useReroll: opts.useReroll });
  }

  const rolls: ArcadeRollPublic[] = [];
  let lastDon: 'win' | 'lose' | undefined;
  let last: ArcadeRollOk | undefined;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const step = await processArcadeRollOnce(db, userId, {
      forceSkipShop: !isLast,
    });
    if (!step.ok) return step;
    rolls.push(step.roll);
    if (step.donResult) lastDon = step.donResult;
    last = { ...step, rolls, donResult: lastDon ?? step.donResult };
    if (step.busted) {
      return last;
    }
  }

  return last!;
}
