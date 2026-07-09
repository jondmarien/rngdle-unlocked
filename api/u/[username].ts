import { eq } from 'drizzle-orm';
import { createDb } from '../../server/db/index.js';
import { user, userProgress } from '../../server/db/schema.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import { ogHtmlPage } from '../../server/ogHtml.js';
import { parseCollectionIds } from '../../server/secretMasteries.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/u');

/**
 * OG / Discord HTML for a public profile.
 * /u/:username → rewritten here for crawlers (see vercel.json).
 */
export default defineHandler(async (request) => {
  try {
    const url = requestUrl(request);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/u/:username or bare last segment
    const uIdx = parts.indexOf('u');
    const raw =
      uIdx >= 0 ? (parts[uIdx + 1] ?? '') : (parts[parts.length - 1] ?? '');
    const username = decodeURIComponent(raw).trim().toLowerCase();
    const origin = url.origin;
    const spaUrl = username
      ? `${origin}/u/${encodeURIComponent(username)}`
      : origin;

    log.info('profile og', { username, path: url.pathname });

    if (!username || username.length < 3) {
      return ogHtmlPage({
        title: 'RNGdle Unlocked',
        desc: 'Unlimited CSPRNG rolls · badges · cloud sync',
        spaUrl: origin,
        status: 400,
        linkLabel: 'Open app →',
      });
    }

    let row: {
      name: string;
      username: string | null;
      profileBio: string;
      profileFlair: string;
      profileAccent: string;
      lifetimeEp: number;
      lifetimeRollCount: number;
      badgeCount: number;
    } | null = null;

    try {
      const db = createDb();
      const [u] = await db
        .select({
          id: user.id,
          name: user.name,
          username: user.username,
          profileBio: user.profileBio,
          profileFlair: user.profileFlair,
          profileAccent: user.profileAccent,
        })
        .from(user)
        .where(eq(user.username, username))
        .limit(1);

      if (u) {
        const [progress] = await db
          .select({
            lifetimeEp: userProgress.lifetimeEp,
            lifetimeRollCount: userProgress.lifetimeRollCount,
            collectionJson: userProgress.collectionJson,
          })
          .from(userProgress)
          .where(eq(userProgress.userId, u.id))
          .limit(1);

        let badgeCount = 0;
        try {
          const parsed = JSON.parse(progress?.collectionJson || '[]');
          badgeCount = parseCollectionIds(
            Array.isArray(parsed) ? parsed : [],
          ).size;
        } catch {
          badgeCount = 0;
        }

        row = {
          name: u.name,
          username: u.username,
          profileBio: u.profileBio || '',
          profileFlair: u.profileFlair || '',
          profileAccent: u.profileAccent || 'teal',
          lifetimeEp: progress?.lifetimeEp ?? 0,
          lifetimeRollCount: progress?.lifetimeRollCount ?? 0,
          badgeCount,
        };
      }
    } catch (dbErr) {
      log.error('db lookup failed', {
        err: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }

    if (!row) {
      return ogHtmlPage({
        title: `RNGdle Unlocked · @${username}`,
        desc: 'Player profile not found — open the app to roll and claim a username.',
        spaUrl,
        status: 200,
        linkLabel: 'Open profile →',
        ogType: 'profile',
      });
    }

    const handle = row.username || username;
    const title = `RNGdle Unlocked · @${handle}`;
    const desc = [
      row.profileFlair || null,
      `${row.lifetimeEp.toLocaleString()} EP`,
      `${row.badgeCount} badges`,
      `${row.lifetimeRollCount.toLocaleString()} rolls`,
      row.profileBio?.trim() || null,
    ]
      .filter(Boolean)
      .join(' · ');

    const ogImage = `${origin}/api/og?type=profile&u=${encodeURIComponent(handle)}&ep=${encodeURIComponent(String(row.lifetimeEp))}&badges=${encodeURIComponent(String(row.badgeCount))}&rolls=${encodeURIComponent(String(row.lifetimeRollCount))}&flair=${encodeURIComponent(row.profileFlair || '')}&name=${encodeURIComponent(row.name || '')}&accent=${encodeURIComponent(row.profileAccent || 'teal')}`;

    return ogHtmlPage({
      title,
      desc:
        desc ||
        `Public profile for @${handle} on RNGdle Unlocked — unlimited rolls, badges, EP.`,
      spaUrl,
      ogImage,
      status: 200,
      linkLabel: 'Open profile →',
      ogType: 'profile',
    });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response('Server error', { status: 500 });
  }
});
