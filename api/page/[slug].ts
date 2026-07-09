import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { ogHtmlPage } from '../../server/ogHtml.js';
import {
  PAGE_OG,
  pageOgImageUrl,
  resolvePageOgSlug,
} from '../../server/pageOg.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/page');

/**
 * OG / Discord HTML for static SPA routes (home, leaderboard, about, …).
 * Bot UA rewrites in vercel.json land here.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = requestUrl(request);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/page/:slug
    const pageIdx = parts.indexOf('page');
    const rawSlug =
      url.searchParams.get('page') ||
      url.searchParams.get('slug') ||
      (pageIdx >= 0 ? (parts[pageIdx + 1] ?? '') : (parts[parts.length - 1] ?? ''));

    const slug = resolvePageOgSlug(rawSlug) ?? resolvePageOgSlug('home');
    if (!slug) {
      return ogHtmlPage({
        title: 'RNGdle Unlocked',
        desc: 'Unlimited CSPRNG rolls · badges · cloud sync',
        spaUrl: url.origin,
        status: 404,
        linkLabel: 'Open app →',
      });
    }

    const meta = PAGE_OG[slug];
    const spaUrl = `${url.origin}${meta.path === '/' ? '/' : meta.path}`;
    const ogImage = pageOgImageUrl(url.origin, slug);

    log.info('page og', { slug, path: meta.path });

    return ogHtmlPage({
      title: meta.title,
      desc: meta.description,
      spaUrl,
      ogImage,
      status: 200,
      linkLabel: 'Open in app →',
      ogType: 'website',
    });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response('Server error', { status: 500 });
  }
});
