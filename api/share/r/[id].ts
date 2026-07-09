import { and, eq } from 'drizzle-orm';
import { createDb } from '../../../server/db/index.js';
import { rolls, user } from '../../../server/db/schema.js';
import type { ApiRequest } from '../../../server/http.js';

/**
 * HTML share page with Open Graph tags for Discord / social crawlers.
 * Humans get a meta-refresh into the SPA at /r/:id
 */
export default async function handler(request: ApiRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = decodeURIComponent(parts[parts.length - 1] ?? '');
    const origin = `${url.protocol}//${url.host}`;

    const db = createDb();
    const [row] = await db
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

    if (!row) {
      return new Response('Roll not found', { status: 404 });
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

    const spaUrl = `${origin}/r/${encodeURIComponent(id)}`;
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
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    console.error('[api/share/r]', err);
    return new Response('Server error', { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
