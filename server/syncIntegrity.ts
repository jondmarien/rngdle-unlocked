import { eq, inArray } from 'drizzle-orm';
import type { CollectionEntry, PlayStats, RollResult } from '../src/game/types.js';
import type { Db } from './db/index.js';
import { rolls } from './db/schema.js';
import type { CloudSavePayload } from './sync.js';

/**
 * Lifetime EP includes journey + secret seals (not on roll rows).
 * Allow a large one-sync award budget so real grinders are not rejected.
 */
const JOURNEY_SECRET_EP_SLACK = 80_000;
/**
 * Number-family badges not yet present on uploaded history (UPSERT_CAP lag).
 * Journey / secret seals are excluded from this check.
 */
const COLLECTION_SLACK = 12;

export class SyncIntegrityError extends Error {
  readonly code = 'SYNC_INTEGRITY' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SyncIntegrityError';
  }
}

function bestRollId(stats: PlayStats | null | undefined): string | null {
  const id = stats?.bestRoll?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function badgeIdsFromRolls(history: RollResult[]): Set<string> {
  const ids = new Set<string>();
  for (const r of history) {
    for (const b of r.badges ?? []) {
      if (b?.id) ids.add(b.id);
    }
  }
  return ids;
}

/** Journey / secret seals are not attached to individual roll rows. */
function isRollExplainableBadge(entry: CollectionEntry): boolean {
  const family = entry.family;
  if (family === 'journey' || family === 'secret') return false;
  return true;
}

/**
 * Reject client sync payloads that claim another user's rolls or inflate
 * EP/collection far beyond what the user's own roll rows can explain.
 */
export async function assertSyncIntegrity(
  db: Db,
  userId: string,
  local: CloudSavePayload,
  cloud: CloudSavePayload | null,
): Promise<void> {
  const history = Array.isArray(local.history) ? local.history : [];
  const historyIds = [
    ...new Set(
      history.map((r) => r?.id).filter((id): id is string => Boolean(id)),
    ),
  ];

  if (historyIds.length > 0) {
    const existing = await db
      .select({ id: rolls.id, userId: rolls.userId })
      .from(rolls)
      .where(inArray(rolls.id, historyIds));

    const foreign = existing.find((r) => r.userId !== userId);
    if (foreign) {
      throw new SyncIntegrityError(
        'Sync rejected: history includes a roll owned by another account',
      );
    }
  }

  const claimedBest = bestRollId(local.stats);
  if (claimedBest) {
    const inHistory = historyIds.includes(claimedBest);
    const [row] = await db
      .select({ id: rolls.id, userId: rolls.userId })
      .from(rolls)
      .where(eq(rolls.id, claimedBest))
      .limit(1);

    if (row && row.userId !== userId) {
      throw new SyncIntegrityError(
        'Sync rejected: best roll belongs to another account (cloned local progress)',
      );
    }
    if (!row && !inHistory) {
      throw new SyncIntegrityError(
        'Sync rejected: best roll id is not among your rolls',
      );
    }
  }

  const cloudEp = cloud?.lifetimeEP ?? 0;
  const claimedEp = Number(local.lifetimeEP) || 0;
  const deltaEp = Math.max(0, claimedEp - cloudEp);

  const cloudIds = new Set((cloud?.history ?? []).map((r) => r.id));
  const newRolls = history.filter((r) => r?.id && !cloudIds.has(r.id));
  const newRollEp = newRolls.reduce(
    (sum, r) => sum + (Number(r.totalEP) || 0),
    0,
  );

  if (deltaEp > newRollEp + JOURNEY_SECRET_EP_SLACK) {
    throw new SyncIntegrityError(
      'Sync rejected: claimed EP increase is not explained by new rolls',
    );
  }

  const cloudCollection = new Set(
    (cloud?.collection ?? []).map((c) => c.badgeId).filter(Boolean),
  );
  const localCollection: CollectionEntry[] = Array.isArray(local.collection)
    ? local.collection
    : [];
  const newNumberBadges = localCollection.filter(
    (c) =>
      c?.badgeId &&
      !cloudCollection.has(c.badgeId) &&
      isRollExplainableBadge(c),
  );

  if (newNumberBadges.length === 0) return;

  const explainable = badgeIdsFromRolls([
    ...history,
    ...(cloud?.history ?? []),
  ]);
  const unexplained = newNumberBadges.filter(
    (c) => !explainable.has(c.badgeId),
  );

  if (unexplained.length > COLLECTION_SLACK) {
    throw new SyncIntegrityError(
      'Sync rejected: collection growth is not explained by your rolls',
    );
  }

  const ownedRollEstimate = cloudIds.size + newRolls.length;
  if (
    localCollection.length >= 40 &&
    ownedRollEstimate < 5 &&
    unexplained.length >= 10
  ) {
    throw new SyncIntegrityError(
      'Sync rejected: large collection without matching roll history',
    );
  }
}
