import { and, desc, eq, gte, isNotNull, ne } from 'drizzle-orm';
import { startOfUtcDay, startOfUtcIsoWeek } from '../src/game/challenge.js';
import { NUMBER_BADGES } from '../src/game/badges/catalog.js';
import { JOURNEY_BADGES } from '../src/game/journey.js';
import { LIFETIME_EP_BADGES } from '../src/game/lifetimeEp.js';
import { SECRET_BADGES } from '../src/game/secrets.js';
import type { CollectionEntry, RollResult } from '../src/game/types.js';
import type { Db } from './db/index.js';
import { rolls, systemMessages, user } from './db/schema.js';
import { createLogger } from './logger.js';
import { createNotification } from './notifications.js';

/** Community crown windows: UTC calendar day, UTC ISO week, all-time. */
type CrownPeriod = 'today' | 'week' | 'alltime';

const log = createLogger('roll-activity');

const NAME_BY_ID = new Map<string, { name: string; emoji: string }>();
for (const b of NUMBER_BADGES) {
  NAME_BY_ID.set(b.id, { name: b.name, emoji: b.emoji });
}
for (const b of JOURNEY_BADGES) {
  NAME_BY_ID.set(b.id, { name: b.name, emoji: b.emoji });
}
for (const b of LIFETIME_EP_BADGES) {
  NAME_BY_ID.set(b.id, { name: b.name, emoji: b.emoji });
}
for (const b of SECRET_BADGES) {
  NAME_BY_ID.set(b.id, { name: b.name, emoji: b.emoji });
}

function labelFor(badgeId: string): { name: string; emoji: string } {
  return NAME_BY_ID.get(badgeId) ?? { name: badgeId, emoji: '✦' };
}

/**
 * After a cloud merge: notify the user for newly unlocked badges/secrets,
 * broadcast system messages if they take day/week/all-time best, and
 * personally notify whoever they overtook on those boards.
 */
export async function processRollActivity(
  db: Db,
  opts: {
    userId: string;
    prevCollection: CollectionEntry[];
    nextCollection: CollectionEntry[];
    prevRollIds: Set<string>;
    newRolls: RollResult[];
  },
): Promise<void> {
  try {
    await notifyNewBadges(
      db,
      opts.userId,
      opts.prevCollection,
      opts.nextCollection,
    );
  } catch (e) {
    log.error('notify badges failed', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  if (opts.newRolls.length === 0) return;

  try {
    await maybeBroadcastCommunityBests(db, {
      userId: opts.userId,
      newRolls: opts.newRolls,
    });
  } catch (e) {
    log.error('community best broadcast failed', {
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

async function notifyNewBadges(
  db: Db,
  userId: string,
  prev: CollectionEntry[],
  next: CollectionEntry[],
): Promise<void> {
  const had = new Set(prev.map((c) => c.badgeId));
  const fresh = next.filter((c) => !had.has(c.badgeId));
  if (fresh.length === 0) return;

  // Cap burst size (first full sync of an old account)
  const batch = fresh.slice(0, 20);

  for (const entry of batch) {
    const meta = labelFor(entry.badgeId);
    const isSecret =
      entry.family === 'secret' || entry.badgeId.startsWith('secret-');
    const notifId = `unlock-${userId}-${entry.badgeId}`;

    try {
      if (isSecret) {
        await createNotification(db, {
          id: notifId,
          userId,
          kind: 'secret_mastery',
          title: `${meta.emoji} Secret unlocked: ${meta.name}`,
          body:
            entry.badgeId === 'secret-omega-codex'
              ? 'You completed the entire codex. Codex Absolute is yours.'
              : `You completed a badge set and earned the secret seal “${meta.name}”. Open Codex → Secret to admire it.`,
          href: '/collection',
        });
      } else {
        await createNotification(db, {
          id: notifId,
          userId,
          kind: 'badge_unlock',
          title: `${meta.emoji} New badge: ${meta.name}`,
          body: `First-time unlock in your codex (${entry.family}).`,
          href: '/collection',
        });
      }
    } catch {
      // Duplicate PK (already notified) or transient DB error — skip
    }
  }

  log.info('badge notifs', { userId, count: batch.length });
}

async function maybeBroadcastCommunityBests(
  db: Db,
  opts: { userId: string; newRolls: RollResult[] },
): Promise<void> {
  const [u] = await db
    .select({ username: user.username, name: user.name })
    .from(user)
    .where(eq(user.id, opts.userId))
    .limit(1);

  const handle = u?.username?.trim().toLowerCase() || null;
  if (!handle) {
    // Community board requires a public username
    return;
  }

  const candidate = [...opts.newRolls].sort(
    (a, b) => b.totalEP - a.totalEP || b.number - a.number,
  )[0];
  if (!candidate || candidate.totalEP <= 0) return;

  const now = Date.now();
  const dayStart = startOfUtcDay(new Date(now));
  const weekStart = startOfUtcIsoWeek(new Date(now));

  const base = {
    championUserId: opts.userId,
    candidate,
    handle,
    name: u?.name ?? handle,
  };

  await tryCrown(db, { ...base, period: 'today', since: dayStart });
  await tryCrown(db, { ...base, period: 'week', since: weekStart });
  await tryCrown(db, { ...base, period: 'alltime', since: null });
}

function crownPeriodCopy(period: CrownPeriod): {
  possessive: string;
  board: string;
  systemTitle: (handle: string) => string;
  overtakeTitle: string;
} {
  switch (period) {
    case 'today':
      return {
        possessive: "today's",
        board: "today's best roll",
        systemTitle: (h) => `👑 Today's best roll — @${h}`,
        overtakeTitle: "📉 Overtaken — today's best",
      };
    case 'week':
      return {
        possessive: "this week's",
        board: "this week's best roll",
        systemTitle: (h) => `👑 Weekly best roll — @${h}`,
        overtakeTitle: '📉 Overtaken — weekly best',
      };
    case 'alltime':
      return {
        possessive: 'the all-time',
        board: 'the all-time best roll',
        systemTitle: (h) => `👑 All-time best roll — @${h}`,
        overtakeTitle: '📉 Overtaken — all-time best',
      };
  }
}

async function tryCrown(
  db: Db,
  opts: {
    period: CrownPeriod;
    /** Null = all-time (no lower bound). */
    since: Date | null;
    championUserId: string;
    candidate: RollResult;
    handle: string;
    name: string;
  },
): Promise<void> {
  const rolledAt = new Date(opts.candidate.rolledAt);
  if (opts.since && rolledAt < opts.since) return;

  // Competitive crowns: only server-issued ranked free-play rolls.
  const periodFilters = [
    eq(rolls.isPublic, true),
    eq(rolls.source, 'ranked'),
    isNotNull(user.username),
    ...(opts.since ? [gte(rolls.rolledAt, opts.since)] : []),
  ];

  const [top] = await db
    .select({
      id: rolls.id,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      shortCode: rolls.shortCode,
      username: user.username,
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(and(...periodFilters))
    .orderBy(desc(rolls.totalEp), desc(rolls.rolledAt))
    .limit(1);

  if (!top || top.id !== opts.candidate.id) return;

  const copy = crownPeriodCopy(opts.period);
  const msgId = `best-${opts.period}-${opts.candidate.id}`;
  const code = top.shortCode || top.id;
  const href = `/s/${encodeURIComponent(opts.handle)}/${encodeURIComponent(code)}`;
  const badgeBits = summarizeBadges(opts.candidate);
  const rollStats = `Number ${top.number.toLocaleString()} · ${String(top.rarity).toUpperCase()} · ${Number(top.totalEp).toLocaleString()} EP.`;

  // Previous #1 under the same board (exclude the new champion roll).
  const [prev] = await db
    .select({
      id: rolls.id,
      userId: rolls.userId,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      username: user.username,
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(and(...periodFilters, ne(rolls.id, opts.candidate.id)))
    .orderBy(desc(rolls.totalEp), desc(rolls.rolledAt))
    .limit(1);

  const dethronedHandle = prev?.username?.trim().toLowerCase() || null;
  const dethronedOther = prev != null && prev.userId !== opts.championUserId;

  const systemBody = [
    dethronedOther && dethronedHandle
      ? `@${opts.handle} (${opts.name}) overtook @${dethronedHandle} for ${copy.possessive} crown.`
      : `@${opts.handle} (${opts.name}) claimed ${copy.possessive} crown.`,
    rollStats,
    badgeBits,
    dethronedOther && prev
      ? `Previous: ${prev.number.toLocaleString()} · ${String(prev.rarity).toUpperCase()} · ${Number(prev.totalEp).toLocaleString()} EP.`
      : null,
    `Open: ${href}`,
  ]
    .filter(Boolean)
    .join(' ');

  try {
    await db.insert(systemMessages).values({
      id: msgId,
      title: copy.systemTitle(opts.handle).slice(0, 200),
      body: systemBody.slice(0, 8000),
    });
    log.info('community crown', {
      period: opts.period,
      handle: opts.handle,
      number: top.number,
      ep: top.totalEp,
      overtook: dethronedOther ? dethronedHandle : null,
    });
  } catch {
    // Already broadcast for this roll
  }

  if (dethronedOther && prev) {
    await notifyOvertaken(db, {
      period: opts.period,
      previousUserId: prev.userId,
      previousNumber: prev.number,
      previousEp: prev.totalEp,
      previousRarity: String(prev.rarity),
      championHandle: opts.handle,
      championNumber: top.number,
      championEp: Number(top.totalEp),
      championRarity: String(top.rarity),
      championRollId: opts.candidate.id,
      href,
      boardLabel: copy.board,
      overtakeTitle: copy.overtakeTitle,
    });
  }
}

/** Personal Activity alert when someone else takes a crown you held. */
async function notifyOvertaken(
  db: Db,
  opts: {
    period: CrownPeriod;
    previousUserId: string;
    previousNumber: number;
    previousEp: number;
    previousRarity: string;
    championHandle: string;
    championNumber: number;
    championEp: number;
    championRarity: string;
    championRollId: string;
    href: string;
    boardLabel: string;
    overtakeTitle: string;
  },
): Promise<void> {
  const notifId = `overtake-${opts.period}-${opts.championRollId}`;
  const body = [
    `@${opts.championHandle} took ${opts.boardLabel} with ${opts.championNumber.toLocaleString()} · ${opts.championRarity.toUpperCase()} · ${opts.championEp.toLocaleString()} EP.`,
    `Your previous lead: ${opts.previousNumber.toLocaleString()} · ${opts.previousRarity.toUpperCase()} · ${opts.previousEp.toLocaleString()} EP.`,
    'Time to roll again.',
  ].join(' ');

  try {
    await createNotification(db, {
      id: notifId,
      userId: opts.previousUserId,
      kind: 'overtaken',
      title: opts.overtakeTitle,
      body,
      href: opts.href,
      actorUsername: opts.championHandle,
    });
    log.info('overtake notif', {
      period: opts.period,
      victim: opts.previousUserId,
      by: opts.championHandle,
      rollId: opts.championRollId,
    });
  } catch {
    // Duplicate (already notified for this crown event) or transient DB error
  }
}

function summarizeBadges(roll: RollResult): string {
  try {
    const badges = roll.badges ?? [];
    if (!badges.length) return `${0} badges.`;
    const top = [...badges]
      .sort((a, b) => (b.ep ?? 0) - (a.ep ?? 0))
      .slice(0, 4)
      .map((b) => `${b.emoji ?? ''} ${b.name}`.trim())
      .filter(Boolean);
    const extra = badges.length - top.length;
    return [
      `${badges.length} badge${badges.length === 1 ? '' : 's'}`,
      top.length ? `(${top.join(', ')}${extra > 0 ? ` +${extra}` : ''})` : null,
    ]
      .filter(Boolean)
      .join(' ');
  } catch {
    return '';
  }
}
