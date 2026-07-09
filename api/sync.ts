import { createAuth } from '../server/auth';
import { createDb } from '../server/db';
import {
  loadCloudSave,
  saveCloudMerge,
  type CloudSavePayload,
} from '../server/sync';

async function requireUserId(request: Request): Promise<string | null> {
  const auth = createAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = createDb();

    if (request.method === 'GET') {
      const cloud = await loadCloudSave(db, userId);
      return Response.json({ cloud });
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as CloudSavePayload;
      if (
        typeof body.lifetimeEP !== 'number' ||
        typeof body.lifetimeRollCount !== 'number' ||
        !Array.isArray(body.history)
      ) {
        return Response.json({ error: 'Invalid payload' }, { status: 400 });
      }
      const merged = await saveCloudMerge(db, userId, {
        lifetimeEP: body.lifetimeEP,
        lifetimeRollCount: body.lifetimeRollCount,
        journeyEP: body.journeyEP ?? 0,
        collection: body.collection ?? [],
        stats: body.stats,
        history: body.history ?? [],
      });
      return Response.json({ cloud: merged });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    console.error('[api/sync]', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
