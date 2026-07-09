import { eq } from 'drizzle-orm';
import { createAttestationSeal } from '../server/attest.js';
import { createAuth } from '../server/auth.js';
import { createDb } from '../server/db/index.js';
import { rolls } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/attest');

/**
 * Optional competitive seal (feature 4).
 * Body: { id, number, totalEP, rolledAt, shortCode? }
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createDb();
  const rl = await checkRateLimit(
    db,
    `user:${session.user.id}:attest`,
    LIMITS.attestPerMinute,
    60_000,
  );
  if (isRateLimited(rl)) {
    return rateLimitedResponse(rl, 'Rate limited', true);
  }

  let body: {
    id?: string;
    number?: number;
    totalEP?: number;
    rolledAt?: string;
    shortCode?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = body.id?.trim();
  const number = body.number;
  const totalEP = body.totalEP;
  const rolledAt = body.rolledAt;
  if (
    !id ||
    typeof number !== 'number' ||
    !Number.isInteger(number) ||
    typeof totalEP !== 'number' ||
    !rolledAt
  ) {
    return Response.json(
      { error: 'Need id, number, totalEP, rolledAt' },
      { status: 400 },
    );
  }

  const seal = await createAttestationSeal({
    userId: session.user.id,
    rollId: id,
    number,
    totalEp: totalEP,
    rolledAt,
  });
  const attestedAt = new Date();

  const [existing] = await db
    .select()
    .from(rolls)
    .where(eq(rolls.id, id))
    .limit(1);

  if (existing) {
    if (existing.userId !== session.user.id) {
      return Response.json({ error: 'Not your roll' }, { status: 403 });
    }
    await db
      .update(rolls)
      .set({
        attestationSeal: seal,
        attestedAt,
      })
      .where(eq(rolls.id, id));
  } else {
    // Seal can be requested before full sync — create a minimal public row
    await db.insert(rolls).values({
      id,
      userId: session.user.id,
      number,
      totalEp: totalEP,
      rarity: 'common',
      percentile: 50,
      badgesJson: '[]',
      rolledAt: new Date(rolledAt),
      isPublic: true,
      shortCode: body.shortCode ?? null,
      attestationSeal: seal,
      attestedAt,
    });
  }

  log.info('sealed', { userId: session.user.id, rollId: id });
  return Response.json({
    ok: true,
    seal,
    attestedAt: attestedAt.toISOString(),
    rollId: id,
  });
});
