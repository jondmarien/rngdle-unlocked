import { and, eq, or } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { rolls, user } from './db/schema.js';

export type PublicRollRow = {
  id: string;
  shortCode: string | null;
  number: number;
  totalEp: number;
  rarity: string;
  percentile: number;
  badgesJson: string;
  rolledAt: Date;
  username: string | null;
  name: string;
};

/** Lookup public roll by UUID id or short vanity code. Optional username check. */
export async function findPublicRoll(
  db: Db,
  key: string,
  username?: string | null,
): Promise<PublicRollRow | null> {
  const base = and(
    or(eq(rolls.id, key), eq(rolls.shortCode, key)),
    eq(rolls.isPublic, true),
  );

  const rows = await db
    .select({
      id: rolls.id,
      shortCode: rolls.shortCode,
      number: rolls.number,
      totalEp: rolls.totalEp,
      rarity: rolls.rarity,
      percentile: rolls.percentile,
      badgesJson: rolls.badgesJson,
      rolledAt: rolls.rolledAt,
      username: user.username,
      name: user.name,
    })
    .from(rolls)
    .innerJoin(user, eq(user.id, rolls.userId))
    .where(base)
    .limit(5);

  if (rows.length === 0) return null;

  if (username && username !== 'player' && username !== '_') {
    const match = rows.find(
      (r) => (r.username ?? '').toLowerCase() === username.toLowerCase(),
    );
    if (match) return match;
    // Username in URL is vanity; still return the roll if code is unique
  }

  return rows[0] ?? null;
}
