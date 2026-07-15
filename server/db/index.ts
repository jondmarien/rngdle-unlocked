import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { noteNeonRoundTrip } from './neonRtt.js';
import * as schema from './schema.js';

/**
 * Neon HTTP + drizzle-orm/neon-http.
 *
 * Ranked persist (CTE INSERT rolls + UPSERT user_progress) and crown tops
 * (UNION ALL) are neon-http **one-shot** SQL statements — not interactive
 * transactions / Pool sessions. Review carefully before swapping drivers or
 * introducing `db.batch` for those paths; statement count and RTT accounting
 * assume one awaited call ≈ one HTTP round-trip.
 */
export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = neon(databaseUrl);
  // Silent logger: increments ALS counter when runWithNeonRttCount is active.
  return drizzle(sql, {
    schema,
    logger: {
      logQuery(_query: string, _params: unknown[]) {
        noteNeonRoundTrip();
      },
    },
  });
}

export type Db = ReturnType<typeof createDb>;
export { schema };
export {
  getNeonRttSnapshot,
  isNeonRttCountEnabled,
  noteNeonRoundTrip,
  runWithNeonRttCount,
} from './neonRtt.js';
