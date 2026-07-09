import { createDb } from '../../server/db/index.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { ogHtmlPage } from '../../server/ogHtml.js';
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
      return ogHtmlPage({
        title: 'RNGdle Unlocked',
        desc: 'Unlimited CSPRNG rolls · badges · cloud sync',
        spaUrl: origin,
        status: 400,
        linkLabel: 'Open app →',
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
      return ogHtmlPage({
        title: 'RNGdle Unlocked · Shared roll',
        desc: 'Open this link in the app. Sync to cloud after rolling so the public page can load.',
        spaUrl,
        status: 200,
        linkLabel: 'Open roll →',
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

    return ogHtmlPage({
      title,
      desc,
      spaUrl,
      ogImage,
      status: 200,
      linkLabel: 'Open roll →',
    });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response('Server error', { status: 500 });
  }
});

