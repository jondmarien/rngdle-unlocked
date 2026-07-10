import { eq } from 'drizzle-orm';
import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createAttestationSeal } from '../server/attest.js';
import { createDb } from '../server/db/index.js';
import { rolls } from '../server/db/schema.js';
import { createLogger } from '../server/logger.js';
import { LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/attest');

/**
 * Optional competitive seal (feature 4).
 * Body: { id, number, totalEP, rolledAt, shortCode? }
 * Does not insert rolls — sync first; only seals an existing owned row.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;

  const db = createDb();
  const limited = await rateGuard(
    db,
    `user:${me.id}:attest`,
    LIMITS.attestPerMinute,
    60_000,
  );
  if (limited) return limited;

  const parsed = await readJson<{
    id?: string;
    number?: number;
    totalEP?: number;
    rolledAt?: string;
    shortCode?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

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

  const [existing] = await db
    .select()
    .from(rolls)
    .where(eq(rolls.id, id))
    .limit(1);

  if (!existing) {
    return Response.json(
      { error: 'Roll not found — sync first' },
      { status: 404 },
    );
  }

  if (existing.userId !== me.id) {
    return Response.json({ error: 'Not your roll' }, { status: 403 });
  }

  if (existing.number !== number) {
    return Response.json(
      { error: 'Number does not match existing roll' },
      { status: 400 },
    );
  }

  const seal = await createAttestationSeal({
    userId: me.id,
    rollId: id,
    number: existing.number,
    totalEp: existing.totalEp,
    rolledAt:
      existing.rolledAt instanceof Date
        ? existing.rolledAt.toISOString()
        : String(existing.rolledAt),
  });
  const attestedAt = new Date();

  await db
    .update(rolls)
    .set({
      attestationSeal: seal,
      attestedAt,
    })
    .where(eq(rolls.id, id));

  log.info('sealed', { userId: me.id, rollId: id });
  return Response.json({
    ok: true,
    seal,
    attestedAt: attestedAt.toISOString(),
    rollId: id,
  });
});
