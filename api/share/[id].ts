import { createDb } from '../../server/db/index.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { findPublicRoll } from '../../server/rollLookup.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/share');

/**
 * OG / Discord HTML for a roll (internal).
 * Public vanity URLs: /s/:user/:code → rewritten here for crawlers.
 * Meta-refresh sends humans to the same vanity SPA path when possible.
 */
export default defineHandler(async (request) => {
  try {
    const url = requestUrl(request);
    const parts = url.pathname.split('/').filter(Boolean);
    let key = '';
    const shareIdx = parts.indexOf('share');
    if (shareIdx >= 0) {
      const after = parts.slice(shareIdx + 1).filter((p) => p !== 'r');
      key = decodeURIComponent(after[after.length - 1] ?? '');
    }
    if (!key) key = decodeURIComponent(parts[parts.length - 1] ?? '');
    if (!key || key === 'share') {
      key = url.searchParams.get('id') ?? url.searchParams.get('code') ?? '';
    }
    const userHint =
      url.searchParams.get('user') ?? url.searchParams.get('u') ?? undefined;

    const origin = url.origin;
    log.info('share', { key, userHint, path: url.pathname });

    if (!key) {
      return htmlPage({
        title: 'RNGdle Unlocked',
        desc: 'Unlimited CSPRNG rolls · badges · cloud sync',
        spaUrl: origin,
        status: 400,
      });
    }

    let row: Awaited<ReturnType<typeof findPublicRoll>> = null;
    try {
      const db = createDb();
      row = await findPublicRoll(db, key, userHint);
    } catch (dbErr) {
      log.error('db lookup failed', {
        err: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    if (!row) {
      const fallbackUser = userHint && userHint !== 'player' ? userHint : null;
      const spaUrl = fallbackUser
        ? `${origin}/s/${encodeURIComponent(fallbackUser)}/${encodeURIComponent(key)}`
        : `${origin}/r/${encodeURIComponent(key)}`;
      return htmlPage({
        title: 'RNGdle Unlocked · Shared roll',
        desc: 'Open this link in the app. Sync to cloud after rolling so the public page can load.',
        spaUrl,
        status: 200,
      });
    }

    let badgeCount = 0;
    let topBadges = '';
    try {
      const badges = JSON.parse(row.badgesJson || '[]') as {
        emoji?: string;
        name?: string;
      }[];
      badgeCount = badges.length;
      topBadges = badges
        .slice(0, 3)
        .map((b) => `${b.emoji ?? ''} ${b.name ?? ''}`.trim())
        .join(' · ');
    } catch {
      /* ignore */
    }

    const title = `RNGdle Unlocked 🎲 ${row.number}`;
    const desc = [
      `${String(row.rarity).toUpperCase()} · ${row.totalEp.toLocaleString()} EP`,
      badgeCount ? `${badgeCount} badges` : null,
      topBadges || null,
      row.username ? `@${row.username}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const code = row.shortCode || row.id;
    const handle = row.username || userHint || 'player';
    const spaUrl = `${origin}/s/${encodeURIComponent(handle)}/${encodeURIComponent(code)}`;
    const ogImage = `${origin}/api/og?code=${encodeURIComponent(code)}&user=${encodeURIComponent(handle)}&n=${encodeURIComponent(String(row.number))}&r=${encodeURIComponent(String(row.rarity))}&ep=${encodeURIComponent(String(row.totalEp))}&u=${encodeURIComponent(handle)}`;

    return htmlPage({ title, desc, spaUrl, ogImage, status: 200 });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response('Server error', { status: 500 });
  }
});

function htmlPage(opts: {
  title: string;
  desc: string;
  spaUrl: string;
  status: number;
  ogImage?: string;
}): Response {
  const { title, desc, spaUrl, status, ogImage } = opts;
  const imageMeta = ogImage
    ? `
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
    : `
  <meta name="twitter:card" content="summary" />`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(spaUrl)}" />
  <meta property="og:site_name" content="RNGdle Unlocked" />${imageMeta}
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(spaUrl)}" />
  <link rel="canonical" href="${escapeHtml(spaUrl)}" />
</head>
<body style="font-family:system-ui;background:#0f1412;color:#ecfdf5;padding:2rem">
  <p><strong>${escapeHtml(title)}</strong></p>
  <p>${escapeHtml(desc)}</p>
  <p><a href="${escapeHtml(spaUrl)}" style="color:#5eead4">Open roll →</a></p>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
