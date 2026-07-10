import { desc, eq, sql } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { featureRequests, featureRequestVotes, user } from './db/schema.js';
import { createLogger } from './logger.js';

const log = createLogger('featureRequests');

export const FEATURE_REQUEST_STATUSES = [
  'submitted',
  'under_review',
  'planned',
  'shipped',
  'declined',
] as const;

export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number];

export type FeatureRequestSort = 'top' | 'newest';

export const FEATURE_TITLE_MAX = 200;
export const FEATURE_TITLE_MIN = 3;
export const FEATURE_DESC_MAX = 2000;

export type FeatureRequestItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  voteCount: number;
  votedByMe: boolean;
  username: string | null;
  name: string;
};

function isStatus(s: string): s is FeatureRequestStatus {
  return (FEATURE_REQUEST_STATUSES as readonly string[]).includes(s);
}

export function validateFeatureRequestBody(input: {
  title?: string;
  description?: string;
}):
  | { ok: true; title: string; description: string }
  | { ok: false; error: string } {
  const title = input.title?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  if (title.length < FEATURE_TITLE_MIN) {
    return {
      ok: false,
      error: `title must be at least ${FEATURE_TITLE_MIN} characters`,
    };
  }
  if (!description) {
    return { ok: false, error: 'description is required' };
  }
  return {
    ok: true,
    title: title.slice(0, FEATURE_TITLE_MAX),
    description: description.slice(0, FEATURE_DESC_MAX),
  };
}

export async function listFeatureRequests(
  db: Db,
  opts: {
    sort: FeatureRequestSort;
    limit: number;
    meUserId: string | null;
  },
): Promise<FeatureRequestItem[]> {
  const voteCount =
    sql<number>`coalesce(count(${featureRequestVotes.userId}), 0)`.mapWith(
      Number,
    );

  const rows = await db
    .select({
      id: featureRequests.id,
      title: featureRequests.title,
      description: featureRequests.description,
      status: featureRequests.status,
      createdAt: featureRequests.createdAt,
      voteCount,
      username: user.username,
      name: user.name,
    })
    .from(featureRequests)
    .innerJoin(user, eq(user.id, featureRequests.userId))
    .leftJoin(
      featureRequestVotes,
      eq(featureRequestVotes.requestId, featureRequests.id),
    )
    .groupBy(
      featureRequests.id,
      featureRequests.title,
      featureRequests.description,
      featureRequests.status,
      featureRequests.createdAt,
      user.username,
      user.name,
    )
    .orderBy(
      opts.sort === 'newest'
        ? desc(featureRequests.createdAt)
        : desc(voteCount),
      desc(featureRequests.createdAt),
    )
    .limit(opts.limit);

  let votedIds = new Set<string>();
  if (opts.meUserId && rows.length > 0) {
    const votes = await db
      .select({ requestId: featureRequestVotes.requestId })
      .from(featureRequestVotes)
      .where(eq(featureRequestVotes.userId, opts.meUserId));
    votedIds = new Set(votes.map((v) => v.requestId));
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
    voteCount: r.voteCount,
    votedByMe: votedIds.has(r.id),
    username: r.username,
    name: r.name,
  }));
}

export async function submitFeatureRequest(
  db: Db,
  opts: { userId: string; title: string; description: string },
): Promise<FeatureRequestItem> {
  const id = crypto.randomUUID();
  await db.insert(featureRequests).values({
    id,
    userId: opts.userId,
    title: opts.title,
    description: opts.description,
    status: 'submitted',
  });

  const [row] = await db
    .select({
      id: featureRequests.id,
      title: featureRequests.title,
      description: featureRequests.description,
      status: featureRequests.status,
      createdAt: featureRequests.createdAt,
      username: user.username,
      name: user.name,
    })
    .from(featureRequests)
    .innerJoin(user, eq(user.id, featureRequests.userId))
    .where(eq(featureRequests.id, id))
    .limit(1);

  log.info('submitted', { id, userId: opts.userId });

  return {
    id: row!.id,
    title: row!.title,
    description: row!.description,
    status: row!.status,
    createdAt:
      row!.createdAt instanceof Date
        ? row!.createdAt.toISOString()
        : String(row!.createdAt),
    voteCount: 0,
    votedByMe: false,
    username: row!.username,
    name: row!.name,
  };
}

export async function upvoteFeatureRequest(
  db: Db,
  opts: { userId: string; requestId: string },
): Promise<
  | { ok: true; voteCount: number }
  | { ok: false; status: 404 | 409; error: string }
> {
  const [exists] = await db
    .select({ id: featureRequests.id })
    .from(featureRequests)
    .where(eq(featureRequests.id, opts.requestId))
    .limit(1);
  if (!exists) {
    return { ok: false, status: 404, error: 'Feature request not found' };
  }

  try {
    await db.insert(featureRequestVotes).values({
      userId: opts.userId,
      requestId: opts.requestId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate|primary key/i.test(msg)) {
      return { ok: false, status: 409, error: 'Already voted' };
    }
    throw err;
  }

  const [countRow] = await db
    .select({
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(featureRequestVotes)
    .where(eq(featureRequestVotes.requestId, opts.requestId));

  log.info('voted', { requestId: opts.requestId, userId: opts.userId });
  return { ok: true, voteCount: countRow?.n ?? 0 };
}

export async function setFeatureRequestStatus(
  db: Db,
  opts: { requestId: string; status: string },
): Promise<
  | { ok: true; status: FeatureRequestStatus }
  | { ok: false; status: 400 | 404; error: string }
> {
  if (!isStatus(opts.status)) {
    return {
      ok: false,
      status: 400,
      error: `status must be one of: ${FEATURE_REQUEST_STATUSES.join(', ')}`,
    };
  }

  const [exists] = await db
    .select({ id: featureRequests.id })
    .from(featureRequests)
    .where(eq(featureRequests.id, opts.requestId))
    .limit(1);
  if (!exists) {
    return { ok: false, status: 404, error: 'Feature request not found' };
  }

  await db
    .update(featureRequests)
    .set({ status: opts.status })
    .where(eq(featureRequests.id, opts.requestId));

  log.info('status', { requestId: opts.requestId, status: opts.status });
  return { ok: true, status: opts.status };
}
