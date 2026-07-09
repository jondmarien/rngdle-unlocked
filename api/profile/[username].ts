import { and, desc, eq } from 'drizzle-orm';
import {
  evaluateOwnedSecrets,
  SECRET_BADGES,
  sectionProgress,
  type SectionFamily,
} from '../../src/game/secrets.js';
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

    let collectionRaw: unknown[] = [];
    try {
      const parsed = JSON.parse(progress?.collectionJson || '[]');
      collectionRaw = Array.isArray(parsed) ? parsed : [];
    } catch {
      collectionRaw = [];
    }
    const stats = progress ? JSON.parse(progress.statsJson || '{}') : {};

    // Collect badge ids (tolerate badgeId / id / badge_id shapes)
    const unlockedIds = new Set<string>();
    for (const entry of collectionRaw) {
      if (!entry || typeof entry !== 'object') continue;
      const o = entry as Record<string, unknown>;
      const id = o.badgeId ?? o.id ?? o.badge_id;
      if (typeof id === 'string' && id.length > 0) unlockedIds.add(id);
    }

    // Section complete → secret earned (does not require secret id already stored)
    const earned = evaluateOwnedSecrets(unlockedIds);
    for (const id of unlockedIds) {
      if (id.startsWith('secret-') && !earned.some((s) => s.id === id)) {
        const def = SECRET_BADGES.find((s) => s.id === id);
        if (def) earned.push(def);
      }
    }

    // Only unlocked secret section seals (and omega) — never locked stubs
    const secrets = earned.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      tier: s.tier,
      section: String(s.section),
      ep: s.ep,
      unlocked: true,
    }));

    // Debug aid for incomplete sections (not shown in UI)
    const sectionDebug: Record<string, { have: number; total: number }> = {};
    for (const s of SECRET_BADGES) {
      if (s.section === 'omega') continue;
      sectionDebug[s.section] = sectionProgress(
        s.section as SectionFamily,
        unlockedIds,
      );
    }
    log.info('secrets', {
      username,
      collectionSize: unlockedIds.size,
      secrets: secrets.map((s) => s.id),
      element: sectionDebug.element,
    });

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
        badgeCount: unlockedIds.size,
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
