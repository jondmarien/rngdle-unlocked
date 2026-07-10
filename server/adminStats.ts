import { count, eq, ne } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { arcadeRuns, rolls, user, userReports } from './db/schema.js';

export type AdminStats = {
  users: number;
  rolls: number;
  rankedRolls: number;
  arcadeRunsCompleted: number;
  openReports: number;
};

/** Simple COUNT snapshot for the admin metrics strip. */
export async function getAdminStats(db: Db): Promise<AdminStats> {
  const [[usersRow], [rollsRow], [rankedRow], [arcadeRow], [reportsRow]] =
    await Promise.all([
      db.select({ n: count() }).from(user),
      db.select({ n: count() }).from(rolls),
      db.select({ n: count() }).from(rolls).where(eq(rolls.source, 'ranked')),
      db
        .select({ n: count() })
        .from(arcadeRuns)
        .where(ne(arcadeRuns.status, 'active')),
      db
        .select({ n: count() })
        .from(userReports)
        .where(eq(userReports.status, 'open')),
    ]);

  return {
    users: usersRow?.n ?? 0,
    rolls: rollsRow?.n ?? 0,
    rankedRolls: rankedRow?.n ?? 0,
    arcadeRunsCompleted: arcadeRow?.n ?? 0,
    openReports: reportsRow?.n ?? 0,
  };
}
