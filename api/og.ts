import { createDb } from '../server/db/index.js';
import { requestUrl } from '../server/http.js';
import { createLogger } from '../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../server/rateLimit.js';
import { findPublicRoll } from '../server/rollLookup.js';
import { defineHandler } from '../server/vercel-adapter.js';

const log = createLogger('api/og');

/**
 * Dynamic OG image (feature 11) — SVG card for Discord / social previews.
 * Query: ?code= or ?id=  OR bare roll fields n, r, ep, u
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = requestUrl(request);
  try {
    const db = createDb();
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:og`,
      LIMITS.ogPerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const key =
      url.searchParams.get('code') ||
      url.searchParams.get('id') ||
      url.searchParams.get('k') ||
      '';
    const userHint = url.searchParams.get('user') ?? undefined;

    let number = url.searchParams.get('n') ?? '????';
    let rarity = (url.searchParams.get('r') ?? 'roll').toUpperCase();
    let ep = url.searchParams.get('ep') ?? '—';
    let handle = url.searchParams.get('u') ?? '';

    if (key) {
      const row = await findPublicRoll(db, key, userHint);
      if (row) {
        number = String(row.number);
        rarity = String(row.rarity).toUpperCase();
        ep = row.totalEp.toLocaleString('en-US');
        handle = row.username ? `@${row.username}` : handle;
      }
    }

    if (handle && !handle.startsWith('@') && handle !== 'player') {
      handle = `@${handle}`;
    }

    const svg = buildOgSvg({
      number: escapeXml(String(number)),
      rarity: escapeXml(rarity),
      ep: escapeXml(String(ep)),
      handle: escapeXml(handle),
    });

    log.info('og', { key: key || 'params', number, rarity });
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=120, s-maxage=300',
      },
    });
  } catch (err) {
    log.error('fail', {
      err: err instanceof Error ? err.message : String(err),
    });
    const svg = buildOgSvg({
      number: 'RNGdle',
      rarity: 'UNLOCKED',
      ep: '🎲',
      handle: '',
    });
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
});

function buildOgSvg(opts: {
  number: string;
  rarity: string;
  ep: string;
  handle: string;
}): string {
  const { number, rarity, ep, handle } = opts;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1412"/>
      <stop offset="100%" stop-color="#1a2e28"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#5eead4" stroke-width="3" opacity="0.5"/>
  <text x="80" y="120" fill="#5eead4" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="28" font-weight="700" letter-spacing="8">RNGDLE UNLOCKED</text>
  <text x="80" y="280" fill="#ecfdf5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="96" font-weight="700">${number}</text>
  <text x="80" y="380" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="42" font-weight="700" letter-spacing="4">${rarity}</text>
  <text x="80" y="460" fill="#fbbf24" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="36" font-weight="600">${ep} EP</text>
  ${handle ? `<text x="80" y="540" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="28">${handle}</text>` : ''}
  <text x="1120" y="540" fill="#334155" font-family="system-ui, sans-serif" font-size="22" text-anchor="end">unlimited CSPRNG · badges · cloud</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
