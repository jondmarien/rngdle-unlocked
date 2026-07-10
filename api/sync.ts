import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { createLogger } from '../server/logger.js';
import { LIMITS } from '../server/rateLimit.js';
import {
  MAX_SYNC_PAYLOAD_BYTES,
  cloudSavePayloadSchema,
  jsonByteLength,
  loadCloudSave,
  saveCloudMerge,
  syncPayloadTooLargeResponse,
  type CloudSavePayload,
} from '../server/sync.js';
import { SyncIntegrityError } from '../server/syncIntegrity.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/sync');

export default defineHandler(async (request) => {
  log.info('request', { method: request.method });

  try {
    const gate = await requireUser(request);
    if (!gate.ok) {
      log.warn('unauthorized');
      return gate.response;
    }
    const userId = gate.user.id;
    log.debug('user', { userId });
    const db = createDb();

    if (request.method === 'GET') {
      const limited = await rateGuard(
        db,
        `user:${userId}:sync-get`,
        LIMITS.syncPerMinute,
        60_000,
        { withRetryAfterHeader: false },
      );
      if (limited) return limited;
      const cloud = await loadCloudSave(db, userId);
      return Response.json({ cloud });
    }

    if (request.method === 'POST') {
      const contentLength = Number(request.headers.get('content-length') ?? 0);
      if (contentLength > MAX_SYNC_PAYLOAD_BYTES) {
        log.warn('payload rejected: content-length too large', {
          userId,
          payloadBytes: contentLength,
          maxPayloadBytes: MAX_SYNC_PAYLOAD_BYTES,
        });
        return syncPayloadTooLargeResponse(contentLength);
      }

      // Soft burst guard only (per minute). No hourly roll-upload cap —
      // free play is unlimited and auto-sync should keep up.
      const limited = await rateGuard(
        db,
        `user:${userId}:sync-post`,
        LIMITS.syncPerMinute,
        60_000,
        {
          error: (rl) => `Slow down — try again in ${rl.retryAfterSec}s`,
          withRetryAfterHeader: false,
        },
      );
      if (limited) return limited;

      const parsed = await readJson<unknown>(request, 'Invalid JSON body');
      if (!parsed.ok) return parsed.response;

      const payloadBytes = jsonByteLength(parsed.body);
      log.info('payload size', {
        userId,
        payloadBytes,
        maxPayloadBytes: MAX_SYNC_PAYLOAD_BYTES,
      });
      if (payloadBytes > MAX_SYNC_PAYLOAD_BYTES) {
        log.warn('payload rejected: body too large', {
          userId,
          payloadBytes,
          maxPayloadBytes: MAX_SYNC_PAYLOAD_BYTES,
        });
        return syncPayloadTooLargeResponse(payloadBytes);
      }

      const validated = cloudSavePayloadSchema.safeParse(parsed.body);
      if (!validated.success) {
        log.warn('payload rejected', {
          userId,
          issues: validated.error.issues.slice(0, 3),
        });
        return Response.json({ error: 'Invalid payload' }, { status: 400 });
      }
      // Zod gates the shape; merge keeps its existing normalization/clamps.
      const body = parsed.body as CloudSavePayload;

      try {
        const merged = await saveCloudMerge(db, userId, {
          lifetimeEP: body.lifetimeEP,
          lifetimeRollCount: body.lifetimeRollCount,
          journeyEP: body.journeyEP ?? 0,
          collection: Array.isArray(body.collection) ? body.collection : [],
          stats: body.stats,
          history: body.history ?? [],
        });
        log.info('merged', {
          userId,
          rolls: merged.lifetimeRollCount,
          ep: merged.lifetimeEP,
          history: merged.history.length,
        });
        return Response.json({ cloud: merged });
      } catch (err) {
        if (err instanceof SyncIntegrityError) {
          log.warn('integrity reject', { userId, message: err.message });
          return Response.json(
            { error: err.message, code: err.code },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('handler threw', { err: message });
    return Response.json(
      {
        error: 'Sync failed',
        detail: message.slice(0, 300),
      },
      { status: 500 },
    );
  }
});
