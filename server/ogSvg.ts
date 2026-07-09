import { eq } from 'drizzle-orm';
import type { Db } from './db/index.js';
import { user, userProgress } from './db/schema.js';
import { createLogger } from './logger.js';
import { findPublicRoll } from './rollLookup.js';
import { parseCollectionIds } from './secretMasteries.js';

const log = createLogger('ogSvg');

const ACCENT_STROKE: Record<string, string> = {
  teal: '#2dd4bf',
  violet: '#a78bfa',
  amber: '#fbbf24',
  rose: '#fb7185',
  sky: '#38bdf8',
  emerald: '#34d399',
  mono: '#a1a1aa',
};

/**
 * Dynamic OG image rendering (moved verbatim from api/og.ts).
 * Roll: ?code= / ?id= or n, r, ep, u
 * Profile: ?type=profile&u=handle&ep=&badges=&rolls=&flair=&accent=
 * Page: ?type=page&page=leaderboard&label=…
 */
export async function rollOgResponse(url: URL, db: Db): Promise<Response> {
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

  const svg = buildRollOgSvg({
    number: escapeXml(String(number)),
    rarity: escapeXml(rarity),
    ep: escapeXml(String(ep)),
    handle: escapeXml(handle),
  });

  log.info('og roll', { key: key || 'params', number, rarity });
  return svgResponse(svg, 120);
}

export async function profileOgResponse(url: URL, db: Db): Promise<Response> {
  let handle = (url.searchParams.get('u') || url.searchParams.get('user') || '')
    .trim()
    .replace(/^@/, '');
  let ep = url.searchParams.get('ep') ?? '';
  let badges = url.searchParams.get('badges') ?? '';
  let rolls = url.searchParams.get('rolls') ?? '';
  let flair = url.searchParams.get('flair') ?? '';
  let name = url.searchParams.get('name') ?? '';
  let accent = (url.searchParams.get('accent') || 'teal').toLowerCase();

  // Prefer live DB when handle known (stale query params still ok as fallback)
  if (handle && handle.length >= 3) {
    try {
      const [u] = await db
        .select({
          id: user.id,
          name: user.name,
          username: user.username,
          profileFlair: user.profileFlair,
          profileAccent: user.profileAccent,
        })
        .from(user)
        .where(eq(user.username, handle.toLowerCase()))
        .limit(1);
      if (u) {
        name = u.name || name;
        handle = u.username || handle;
        flair = u.profileFlair || flair;
        accent = (u.profileAccent || accent).toLowerCase();
        const [progress] = await db
          .select({
            lifetimeEp: userProgress.lifetimeEp,
            lifetimeRollCount: userProgress.lifetimeRollCount,
            collectionJson: userProgress.collectionJson,
          })
          .from(userProgress)
          .where(eq(userProgress.userId, u.id))
          .limit(1);
        if (progress) {
          ep = String(progress.lifetimeEp);
          rolls = String(progress.lifetimeRollCount);
          try {
            const parsed = JSON.parse(progress.collectionJson || '[]');
            badges = String(
              parseCollectionIds(Array.isArray(parsed) ? parsed : []).size,
            );
          } catch {
            /* keep query badges */
          }
        }
      }
    } catch {
      /* use query params */
    }
  }

  const epFmt = formatInt(ep);
  const badgesFmt = formatInt(badges);
  const rollsFmt = formatInt(rolls);
  const stroke = ACCENT_STROKE[accent] ?? ACCENT_STROKE.teal;
  const displayHandle = handle
    ? handle.startsWith('@')
      ? handle
      : `@${handle}`
    : '@player';

  const svg = buildProfileOgSvg({
    handle: escapeXml(displayHandle),
    name: escapeXml(truncate(name, 40)),
    flair: escapeXml(truncate(flair, 48)),
    ep: escapeXml(epFmt),
    badges: escapeXml(badgesFmt),
    rolls: escapeXml(rollsFmt),
    stroke: escapeXml(stroke),
  });

  log.info('og profile', { handle: displayHandle, ep: epFmt });
  return svgResponse(svg, 120);
}

/** Shared brand card for static SPA routes (home, leaderboard, about, …). */
export function pageOgResponse(url: URL): Response {
  const page = (url.searchParams.get('page') || 'home').toLowerCase();
  const headline =
    url.searchParams.get('headline') ||
    url.searchParams.get('h') ||
    page.replace(/-/g, ' ');
  const label =
    url.searchParams.get('label') ||
    url.searchParams.get('l') ||
    'Unlimited CSPRNG · badges · EP';
  const svg = buildPageOgSvg({
    headline: escapeXml(truncate(headline, 40)),
    label: escapeXml(truncate(label, 56)),
  });
  log.info('og page', { page });
  return svgResponse(svg, 300);
}

/** Branded fallback card when rendering fails. */
export function fallbackOgResponse(): Response {
  const svg = buildRollOgSvg({
    number: 'RNGdle',
    rarity: 'UNLOCKED',
    ep: '🎲',
    handle: '',
  });
  return svgResponse(svg, 60);
}

function formatInt(v: string): string {
  if (!v || v === '—') return '0';
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-US');
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function svgResponse(svg: string, maxAge: number): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
    },
  });
}

function buildRollOgSvg(opts: {
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

function buildPageOgSvg(opts: { headline: string; label: string }): string {
  const { headline, label } = opts;
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
  <text x="80" y="280" fill="#ecfdf5" font-family="system-ui, sans-serif" font-size="64" font-weight="800">${headline}</text>
  <text x="80" y="380" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="36" font-weight="600">${label}</text>
  <text x="1120" y="540" fill="#334155" font-family="system-ui, sans-serif" font-size="22" text-anchor="end">rngdle-unlocked.chron0.tech</text>
</svg>`;
}

function buildProfileOgSvg(opts: {
  handle: string;
  name: string;
  flair: string;
  ep: string;
  badges: string;
  rolls: string;
  stroke: string;
}): string {
  const { handle, name, flair, ep, badges, rolls, stroke } = opts;
  const flairLine = flair
    ? `<text x="80" y="300" fill="${stroke}" font-family="system-ui, sans-serif" font-size="32" font-weight="600">${flair}</text>`
    : '';
  const nameLine = name
    ? `<text x="80" y="250" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="28">${name}</text>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0e0d0b"/>
      <stop offset="55%" stop-color="#171512"/>
      <stop offset="100%" stop-color="#1a1520"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="${stroke}" stroke-width="3" opacity="0.65"/>
  <text x="80" y="110" fill="${stroke}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="26" font-weight="700" letter-spacing="6">RNGDLE UNLOCKED · PROFILE</text>
  <text x="80" y="200" fill="#f3efe6" font-family="system-ui, sans-serif" font-size="72" font-weight="800">${handle}</text>
  ${nameLine}
  ${flairLine}
  <text x="80" y="400" fill="#fbbf24" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="40" font-weight="700">${ep} EP</text>
  <text x="80" y="470" fill="#a7f3d0" font-family="system-ui, sans-serif" font-size="32" font-weight="600">${badges} badges  ·  ${rolls} rolls</text>
  <text x="1120" y="540" fill="#64748b" font-family="system-ui, sans-serif" font-size="22" text-anchor="end">public profile · roll · collect · climb</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
