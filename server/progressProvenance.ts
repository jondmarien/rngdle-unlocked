import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { rolls } from './db/schema.js';

export type ProgressProvenance =
  | 'cloud_sync'
  | 'cloned_local'
  | 'local_progress'
  | 'unknown';

export type ProgressProvenanceResult = {
  provenance: ProgressProvenance;
  /** Human label for profile pills */
  label: string;
  bestRollId: string | null;
  bestRollOwnerId: string | null;
};

function bestRollIdFromStats(stats: Record<string, unknown>): string | null {
  const best = stats.bestRoll;
  if (!best || typeof best !== 'object') return null;
  const id = (best as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Classify whether public progress looks like real cloud-owned rolls vs a
 * localStorage clone (same bestRoll id pointing at another user's row).
 */
export async function classifyProgressProvenance(
  db: Db,
  userId: string,
  stats: Record<string, unknown>,
  opts: {
    lifetimeRollCount: number;
    ownedPublicRollCount: number;
  },
): Promise<ProgressProvenanceResult> {
  const bestRollId = bestRollIdFromStats(stats);

  if (!bestRollId) {
    if (opts.ownedPublicRollCount > 0 || opts.lifetimeRollCount > 0) {
      return {
        provenance: 'local_progress',
        label: 'Local progress',
        bestRollId: null,
        bestRollOwnerId: null,
      };
    }
    return {
      provenance: 'unknown',
      label: 'Unknown',
      bestRollId: null,
      bestRollOwnerId: null,
    };
  }

  const [row] = await db
    .select({ id: rolls.id, userId: rolls.userId })
    .from(rolls)
    .where(eq(rolls.id, bestRollId))
    .limit(1);

  if (!row) {
    // Claimed best roll id not in DB — progress blob without owning the roll
    return {
      provenance: 'cloned_local',
      label: 'Cloned local progress',
      bestRollId,
      bestRollOwnerId: null,
    };
  }

  if (row.userId !== userId) {
    return {
      provenance: 'cloned_local',
      label: 'Cloned local progress',
      bestRollId,
      bestRollOwnerId: row.userId,
    };
  }

  return {
    provenance: 'cloud_sync',
    label: 'Cloud sync',
    bestRollId,
    bestRollOwnerId: userId,
  };
}
