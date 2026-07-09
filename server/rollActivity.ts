import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';
import { NUMBER_BADGES } from '../src/game/badges/catalog.js';
import { JOURNEY_BADGES } from '../src/game/journey.js';
import { SECRET_BADGES } from '../src/game/secrets.js';
import type { CollectionEntry, RollResult } from '../src/game/types.js';
import type { Db } from './db/index.js';
import { rolls, systemMessages, user } from './db/schema.js';
import { createLogger } from './logger.js';
import { createNotification } from './notifications.js';

const log = createLogger('roll-activity');

const NAME_BY_ID = new Map<string, { name: string; emoji: string }>();
for (const b of NUMBER_BADGES) {
  NAME_BY_ID.set(b.id, { name: b.name, emoji: b.emoji });
}
for (const b of JOURNEY_BADGES) {
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
 * and broadcast system messages if they take today's or this week's best roll.
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
    await notifyNewBadges(db, opts.userId, opts.prevCollection, opts.nextCollection);
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
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

  await tryCrown(db, {
    period: 'today',
    since: dayStart,
    candidate,
    handle,
    name: u?.name ?? handle,
  });
  await tryCrown(db, {
    period: 'week',
    since: weekStart,
    candidate,
    handle,
    name: u?.name ?? handle,
  });
}

async function tryCrown(
  db: Db,
  opts: {
    period: 'today' | 'week';
    since: Date;
    candidate: RollResult;
    handle: string;
    name: string;
  },
): Promise<void> {
  const rolledAt = new Date(opts.candidate.rolledAt);
  if (rolledAt < opts.since) return;

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
    .where(
      and(
        gte(rolls.rolledAt, opts.since),
        eq(rolls.isPublic, true),
        isNotNull(user.username),
      ),
    )
    .orderBy(desc(rolls.totalEp), desc(rolls.rolledAt))
    .limit(1);

  if (!top || top.id !== opts.candidate.id) return;

  const periodLabel = opts.period === 'today' ? "today's" : "this week's";
  const msgId = `best-${opts.period}-${opts.candidate.id}`;
  const code = top.shortCode || top.id;
  const href = `/s/${encodeURIComponent(opts.handle)}/${encodeURIComponent(code)}`;
  const badgeBits = summarizeBadges(opts.candidate);

  const title =
    opts.period === 'today'
      ? `👑 Today's best roll — @${opts.handle}`
      : `👑 Weekly best roll — @${opts.handle}`;

  const body = [
    `@${opts.handle} (${opts.name}) claimed ${periodLabel} crown.`,
    `Number ${top.number.toLocaleString()} · ${String(top.rarity).toUpperCase()} · ${Number(top.totalEp).toLocaleString()} EP.`,
    badgeBits,
    `Open: ${href}`,
  ]
    .filter(Boolean)
    .join(' ');

  try {
    await db.insert(systemMessages).values({
      id: msgId,
      title: title.slice(0, 200),
      body: body.slice(0, 8000),
    });
    log.info('community crown', {
      period: opts.period,
      handle: opts.handle,
      number: top.number,
      ep: top.totalEp,
    });
  } catch {
    // Already broadcast for this roll
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

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
