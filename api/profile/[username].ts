import { and, desc, eq } from 'drizzle-orm';
import { createDb } from '../../server/db/index.js';
import { rolls, user, userProgress } from '../../server/db/schema.js';
import { requestUrl } from '../../server/http.js';
import { createLogger } from '../../server/logger.js';
import {
  checkRateLimit,
  clientIp,
  isRateLimited,
  LIMITS,
  rateLimitedResponse,
} from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/profile');

export default defineHandler(async (request) => {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const db = createDb();
    const ip = clientIp(request);
    const rl = await checkRateLimit(
      db,
      `ip:${ip}:profile`,
      LIMITS.profilePerMinute,
      60_000,
    );
    if (isRateLimited(rl)) {
      return rateLimitedResponse(rl, 'Rate limited', true);
    }

    const url = requestUrl(request);
    const parts = url.pathname.split('/').filter(Boolean);
    const username = decodeURIComponent(parts[parts.length - 1] ?? '')
      .trim()
      .toLowerCase();
    if (!username || username.length < 3) {
      return Response.json({ error: 'Invalid username' }, { status: 400 });
    }

    log.info('lookup', { username });

    const [u] = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        createdAt: user.createdAt,
        profileAccent: user.profileAccent,
        profileBio: user.profileBio,
        profileFlair: user.profileFlair,
      })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (!u) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, u.id))
      .limit(1);

    const recent = await db
      .select({
        id: rolls.id,
        shortCode: rolls.shortCode,
        number: rolls.number,
        totalEp: rolls.totalEp,
        rarity: rolls.rarity,
        percentile: rolls.percentile,
        badgesJson: rolls.badgesJson,
        rolledAt: rolls.rolledAt,
        attestationSeal: rolls.attestationSeal,
        challengeKey: rolls.challengeKey,
      })
      .from(rolls)
      .where(and(eq(rolls.userId, u.id), eq(rolls.isPublic, true)))
      .orderBy(desc(rolls.rolledAt))
      .limit(24);

    const collection = progress
      ? (JSON.parse(progress.collectionJson || '[]') as {
          badgeId?: string;
          family?: string;
        }[])
      : [];
    const stats = progress ? JSON.parse(progress.statsJson || '{}') : {};

    const SECRET_META: Record<
      string,
      {
        name: string;
        emoji: string;
        tier: 'section' | 'omega';
        section: string;
        ep: number;
      }
    > = {
      'secret-master-math': {
        name: 'Theorem Complete',
        emoji: '📐',
        tier: 'section',
        section: 'math',
        ep: 2500,
      },
      'secret-master-pattern': {
        name: 'Pattern Weaver',
        emoji: '🧩',
        tier: 'section',
        section: 'pattern',
        ep: 2500,
      },
      'secret-master-void': {
        name: 'Voidwalker',
        emoji: '🕳️',
        tier: 'section',
        section: 'void',
        ep: 2000,
      },
      'secret-master-cultural': {
        name: 'Lorekeeper',
        emoji: '📜',
        tier: 'section',
        section: 'cultural',
        ep: 3000,
      },
      'secret-master-magnitude': {
        name: 'Scale Breaker',
        emoji: '📏',
        tier: 'section',
        section: 'magnitude',
        ep: 2000,
      },
      'secret-master-sequence': {
        name: 'Sequence Sovereign',
        emoji: '🔢',
        tier: 'section',
        section: 'sequence',
        ep: 2000,
      },
      'secret-master-poker': {
        name: 'Full House Master',
        emoji: '🃏',
        tier: 'section',
        section: 'poker',
        ep: 2500,
      },
      'secret-master-element': {
        name: 'Periodic Crown',
        emoji: '⚛️',
        tier: 'section',
        section: 'element',
        ep: 2500,
      },
      'secret-master-journey': {
        name: 'Path Eternal',
        emoji: '🛤️',
        tier: 'section',
        section: 'journey',
        ep: 5000,
      },
      'secret-omega-codex': {
        name: 'Codex Absolute',
        emoji: '✨',
        tier: 'omega',
        section: 'omega',
        ep: 50_000,
      },
    };

    const secrets = (Array.isArray(collection) ? collection : [])
      .map((c) => {
        const id = c.badgeId;
        if (!id || !SECRET_META[id]) return null;
        const m = SECRET_META[id]!;
        return { id, ...m };
      })
      .filter(Boolean);

    return Response.json({
      profile: {
        username: u.username,
        name: u.name,
        image: u.image,
        memberSince: u.createdAt,
        profileAccent: u.profileAccent || 'teal',
        profileBio: u.profileBio || '',
        profileFlair: u.profileFlair || '',
        lifetimeEP: progress?.lifetimeEp ?? 0,
        lifetimeRollCount: progress?.lifetimeRollCount ?? 0,
        journeyEP: progress?.journeyEp ?? 0,
        badgeCount: Array.isArray(collection) ? collection.length : 0,
        secrets,
        stats,
        recentRolls: recent.map((r) => {
          let topBadges: string[] = [];
          let badgeCount = 0;
          try {
            const badges = JSON.parse(r.badgesJson || '[]') as {
              emoji?: string;
              name?: string;
              ep?: number;
            }[];
            badgeCount = badges.length;
            topBadges = [...badges]
              .sort((a, b) => (b.ep ?? 0) - (a.ep ?? 0))
              .slice(0, 4)
              .map((b) => `${b.emoji ?? ''} ${b.name ?? ''}`.trim());
          } catch {
            badgeCount = 0;
          }
          return {
            id: r.id,
            shortCode: r.shortCode,
            number: r.number,
            totalEP: r.totalEp,
            rarity: r.rarity,
            percentile: r.percentile,
            badgeCount,
            topBadges,
            attested: Boolean(r.attestationSeal),
            challengeKey: r.challengeKey,
            rolledAt:
              r.rolledAt instanceof Date
                ? r.rolledAt.toISOString()
                : String(r.rolledAt),
          };
        }),
      },
    });
  } catch (err) {
    log.error('handler threw', {
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
});
