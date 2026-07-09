/** Shared OG / Discord preview HTML (crawlers). Humans meta-refresh to SPA. */

export function ogHtmlPage(opts: {
  title: string;
  desc: string;
  spaUrl: string;
  status: number;
  ogImage?: string;
  linkLabel?: string;
  /** Open Graph type — rolls use website; profiles use profile */
  ogType?: 'website' | 'profile';
}): Response {
  const {
    title,
    desc,
    spaUrl,
    status,
    ogImage,
    linkLabel = 'Open in app →',
    ogType = 'website',
  } = opts;
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
  <meta property="og:type" content="${escapeHtml(ogType)}" />
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
  <p><a href="${escapeHtml(spaUrl)}" style="color:#5eead4">${escapeHtml(linkLabel)}</a></p>
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

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
