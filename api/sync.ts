import { rateGuard, readJson, requireUser } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { createLogger } from '../server/logger.js';
import { LIMITS } from '../server/rateLimit.js';
import {
  MAX_SYNC_PAYLOAD_BYTES,
  cloudSavePayloadSchema,
  isSyncDeltaPayload,
  jsonByteLength,
  loadCloudSave,
  saveCloudMerge,
  syncDeltaPayloadSchema,
  syncPayloadTooLargeResponse,
  toSyncAck,
  type CloudSavePayload,
} from '../server/sync.js';
import { SyncIntegrityError } from '../server/syncIntegrity.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/sync');

function normalizeLocalPayload(body: CloudSavePayload): CloudSavePayload {
  return {
    lifetimeEP: body.lifetimeEP,
    lifetimeRollCount: body.lifetimeRollCount,
    journeyEP: body.journeyEP ?? 0,
    collection: Array.isArray(body.collection) ? body.collection : [],
    stats: body.stats,
    history: body.history ?? [],
    settings: body.settings,
    settingsUpdatedAt: body.settingsUpdatedAt,
  };
}

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
      const loaded = await loadCloudSave(db, userId);
      return Response.json({
        cloud: loaded?.cloud ?? null,
        updatedAt: loaded?.updatedAt ?? null,
        settingsSyncEnabled: loaded?.settingsSyncEnabled ?? false,
      });
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
      const isDelta = isSyncDeltaPayload(parsed.body);
      log.info('payload size', {
        userId,
        payloadBytes,
        maxPayloadBytes: MAX_SYNC_PAYLOAD_BYTES,
        mode: isDelta ? 'delta' : 'full',
      });
      if (payloadBytes > MAX_SYNC_PAYLOAD_BYTES) {
        log.warn('payload rejected: body too large', {
          userId,
          payloadBytes,
          maxPayloadBytes: MAX_SYNC_PAYLOAD_BYTES,
        });
        return syncPayloadTooLargeResponse(payloadBytes);
      }

      let local: CloudSavePayload;
      if (isDelta) {
        const validated = syncDeltaPayloadSchema.safeParse(parsed.body);
        if (!validated.success) {
          log.warn('delta payload rejected', {
            userId,
            issues: validated.error.issues.slice(0, 3),
          });
          return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }
        const d = validated.data;
        local = {
          lifetimeEP: d.lifetimeEP,
          lifetimeRollCount: d.lifetimeRollCount,
          journeyEP: d.journeyEP ?? 0,
          collection: d.collection as CloudSavePayload['collection'],
          stats: d.stats as CloudSavePayload['stats'],
          history: d.history as CloudSavePayload['history'],
          settings: d.settings as CloudSavePayload['settings'],
          settingsUpdatedAt: d.settingsUpdatedAt,
        };
      } else {
        const validated = cloudSavePayloadSchema.safeParse(parsed.body);
        if (!validated.success) {
          log.warn('payload rejected', {
            userId,
            issues: validated.error.issues.slice(0, 3),
          });
          return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }
        local = normalizeLocalPayload(parsed.body as CloudSavePayload);
      }

      try {
        const { merged, updatedAt, historyUpserted } = await saveCloudMerge(
          db,
          userId,
          local,
        );
        log.info('merged', {
          userId,
          rolls: merged.lifetimeRollCount,
          ep: merged.lifetimeEP,
          history: merged.history.length,
          historyUpserted,
          mode: isDelta ? 'delta' : 'full',
        });
        // Compact ack for both delta and legacy full — SPA is the only client.
        return Response.json(toSyncAck(merged, updatedAt, historyUpserted));
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
