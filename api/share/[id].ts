import { and, eq } from 'drizzle-orm';
import { createDb } from '../../server/db/index.js';
import { rolls, user } from '../../server/db/schema.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/share');

/**
 * OG / Discord share HTML for a roll.
 * Paths: /api/share/:id  (and rewritten from /api/share/r/:id)
 * Humans are meta-refreshed to SPA /r/:id
 */
export default defineHandler(async (request) => {
  try {
    const url = requestUrl(request);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/share/:id  or /api/share/r/:id (if not rewritten)
    let id = '';
    const shareIdx = parts.indexOf('share');
    if (shareIdx >= 0) {
      const after = parts.slice(shareIdx + 1).filter((p) => p !== 'r');
      id = decodeURIComponent(after[after.length - 1] ?? '');
    }
    if (!id) {
      id = decodeURIComponent(parts[parts.length - 1] ?? '');
    }

    // Query param fallback (rewrite destination)
    if (!id || id === 'share') {
      id = url.searchParams.get('id') ?? '';
    }

    const origin = url.origin;
    log.info('share', { id, path: url.pathname });

    if (!id) {
      return htmlPage({
        title: 'RNGdle Unlocked',
        desc: 'Unlimited CSPRNG rolls · badges · cloud sync',
        spaUrl: origin,
        status: 400,
      });
    }

    let row: {
      id: string;
      number: number;
      totalEp: number;
      rarity: string;
      badgesJson: string;
      username: string | null;
    } | null = null;

    try {
      const db = createDb();
      const [found] = await db
        .select({
          id: rolls.id,
          number: rolls.number,
          totalEp: rolls.totalEp,
          rarity: rolls.rarity,
          badgesJson: rolls.badgesJson,
          username: user.username,
        })
        .from(rolls)
        .innerJoin(user, eq(user.id, rolls.userId))
        .where(and(eq(rolls.id, id), eq(rolls.isPublic, true)))
        .limit(1);
      row = found ?? null;
    } catch (dbErr) {
      log.error('db lookup failed', {
        err: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    const spaUrl = `${origin}/r/${encodeURIComponent(id)}`;

    if (!row) {
      // Still redirect humans to SPA; crawlers get a generic card.
      return htmlPage({
        title: 'RNGdle Unlocked · Shared roll',
        desc: 'Open this link in the app. If you just rolled, sync to cloud first so the public page can load.',
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

    return htmlPage({ title, desc, spaUrl, status: 200 });
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
}): Response {
  const { title, desc, spaUrl, status } = opts;
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
  <meta property="og:site_name" content="RNGdle Unlocked" />
  <meta name="twitter:card" content="summary" />
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
