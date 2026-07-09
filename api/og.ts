import { rateGuard } from '../server/apiGuards.js';
import { createDb } from '../server/db/index.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import {
  fallbackOgResponse,
  profileOgResponse,
  rollOgResponse,
} from '../server/ogSvg.js';
import { clientIp, LIMITS } from '../server/rateLimit.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/og');

/**
 * Dynamic OG image — SVG card for Discord / social previews.
 * Rendering + DB lookups live in server/ogSvg.ts.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = requestUrl(request);
  try {
    const db = createDb();
    const ip = clientIp(request);
    const limited = await rateGuard(
      db,
      `ip:${ip}:og`,
      LIMITS.ogPerMinute,
      60_000,
    );
    if (limited) return limited;

    const type = (url.searchParams.get('type') || 'roll').toLowerCase();

    if (type === 'profile') {
      return await profileOgResponse(url, db);
    }

    return await rollOgResponse(url, db);
  } catch (err) {
    log.error('fail', {
      err: err instanceof Error ? err.message : String(err),
    });
    return fallbackOgResponse();
  }
});
