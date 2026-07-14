import { describe, expect, it } from 'vite-plus/test';
import { NUMBER_BADGES } from './badges/catalog';
import { JOURNEY_BADGES } from './journey';
import { LIFETIME_EP_BADGES } from './lifetimeEp';
import {
  OMEGA_SECRET,
  SECTION_SECRETS,
  isSectionComplete,
  mergeSecretUnlocks,
  newlyUnlockedSecrets,
  secretHits,
  sectionProgress,
} from './secrets';
import {
  mergeStreakUnlocks,
  newlyUnlockedStreakSecrets,
  STREAK_SECRETS,
} from './streakSecrets';
import { defaultPlayStats } from './stats';
import type { PlayStats, RollResult } from './types';

function roll(number: number): RollResult {
  return {
    id: `r-${number}`,
    number,
    badges: [],
    totalEP: 1,
    rarity: 'trash',
    percentile: 1,
    rolledAt: new Date().toISOString(),
  };
}

describe('secrets', () => {
  it('section incomplete when empty', () => {
    expect(isSectionComplete('element', new Set())).toBe(false);
    const p = sectionProgress('element', new Set());
    expect(p.have).toBe(0);
    expect(p.total).toBe(
      NUMBER_BADGES.filter((b) => b.family === 'element').length,
    );
  });

  it('unlocks section secret when family complete', () => {
    const ids = new Set(
      NUMBER_BADGES.filter((b) => b.family === 'element').map((b) => b.id),
    );
    const nu = newlyUnlockedSecrets(ids);
    expect(nu.some((s) => s.id === 'secret-master-element')).toBe(true);
    expect(nu.some((s) => s.id === OMEGA_SECRET.id)).toBe(false);
  });

  it('omega only after everything + section secrets', () => {
    const ids = new Set([
      ...NUMBER_BADGES.map((b) => b.id),
      ...JOURNEY_BADGES.map((b) => b.id),
      ...LIFETIME_EP_BADGES.map((b) => b.id),
      ...SECTION_SECRETS.map((s) => s.id),
    ]);
    const nu = newlyUnlockedSecrets(ids);
    // all section secrets already in set → only omega if missing
    expect(nu.map((s) => s.id)).toEqual([OMEGA_SECRET.id]);
  });

  it('omega unlocks without any streak secrets owned', () => {
    const ids = new Set([
      ...NUMBER_BADGES.map((b) => b.id),
      ...JOURNEY_BADGES.map((b) => b.id),
      ...LIFETIME_EP_BADGES.map((b) => b.id),
      ...SECTION_SECRETS.map((s) => s.id),
    ]);
    for (const s of STREAK_SECRETS) {
      expect(ids.has(s.id)).toBe(false);
    }
    expect(newlyUnlockedSecrets(ids).map((s) => s.id)).toEqual([
      OMEGA_SECRET.id,
    ]);
  });

  it('mergeSecretUnlocks is idempotent', () => {
    const ids = NUMBER_BADGES.filter((b) => b.family === 'void').map(
      (b) => b.id,
    );
    const base = ids.map((badgeId) => ({
      badgeId,
      firstEarnedAt: '2020-01-01',
      family: 'void' as const,
    }));
    const once = mergeSecretUnlocks(base);
    expect(once.unlocked.length).toBeGreaterThan(0);
    const twice = mergeSecretUnlocks(once.collection);
    expect(twice.unlocked.length).toBe(0);
  });

  it('omega blocked when missing one bases badge', () => {
    const bases = NUMBER_BADGES.filter((b) => b.family === 'bases');
    expect(bases.length).toBe(10);
    const ids = new Set([
      ...NUMBER_BADGES.filter((b) => b.family !== 'bases').map((b) => b.id),
      ...bases.slice(0, -1).map((b) => b.id),
      ...JOURNEY_BADGES.map((b) => b.id),
      ...SECTION_SECRETS.map((s) => s.id),
    ]);
    expect(
      newlyUnlockedSecrets(ids).some((s) => s.id === OMEGA_SECRET.id),
    ).toBe(false);
    expect(isSectionComplete('bases', ids)).toBe(false);
  });

  it('radix crown unlocks when bases complete', () => {
    const ids = new Set(
      NUMBER_BADGES.filter((b) => b.family === 'bases').map((b) => b.id),
    );
    const nu = newlyUnlockedSecrets(ids);
    expect(nu.some((s) => s.id === 'secret-master-bases')).toBe(true);
  });

  it('chronarch unlocks when years complete', () => {
    const years = NUMBER_BADGES.filter((b) => b.family === 'years');
    expect(years.length).toBe(6);
    const ids = new Set(years.map((b) => b.id));
    const nu = newlyUnlockedSecrets(ids);
    expect(nu.some((s) => s.id === 'secret-master-years')).toBe(true);
  });

  it('atomic seal unlocks when atomic-registry complete', () => {
    const atomic = NUMBER_BADGES.filter((b) => b.family === 'atomic-registry');
    expect(atomic.length).toBe(118);
    const ids = new Set(atomic.map((b) => b.id));
    const nu = newlyUnlockedSecrets(ids);
    expect(nu.some((s) => s.id === 'secret-master-atomic-registry')).toBe(true);
  });

  it('omega blocked when missing one atomic-registry badge', () => {
    const atomic = NUMBER_BADGES.filter((b) => b.family === 'atomic-registry');
    const ids = new Set([
      ...NUMBER_BADGES.filter((b) => b.family !== 'atomic-registry').map(
        (b) => b.id,
      ),
      ...atomic.slice(0, -1).map((b) => b.id),
      ...JOURNEY_BADGES.map((b) => b.id),
      ...LIFETIME_EP_BADGES.map((b) => b.id),
      ...SECTION_SECRETS.map((s) => s.id),
    ]);
    expect(
      newlyUnlockedSecrets(ids).some((s) => s.id === OMEGA_SECRET.id),
    ).toBe(false);
    expect(isSectionComplete('atomic-registry', ids)).toBe(false);
  });
});

describe('streak secrets', () => {
  it('secretHits carries streak image paths for Home celebration', () => {
    const hits = secretHits(STREAK_SECRETS);
    const veryOdd = hits.find((h) => h.id === 'secret-streak-odd-5');
    expect(veryOdd?.image).toBe('/secrets/streak-odd-5.jpg');
  });

  it('unlocks Very Odd at oddStreak 5', () => {
    const stats: PlayStats = { ...defaultPlayStats(), oddStreak: 5 };
    const nu = newlyUnlockedStreakSecrets(stats, [], new Set());
    expect(nu.map((s) => s.id)).toContain('secret-streak-odd-5');
    expect(nu.map((s) => s.id)).not.toContain('secret-streak-odd-10');
  });

  it('unlocks Giant Numbers on sliding last-5 number sum', () => {
    const history = [900_001, 900_002, 900_003, 900_004, 900_005].map(roll);
    const nu = newlyUnlockedStreakSecrets(
      defaultPlayStats(),
      history,
      new Set(),
    );
    expect(nu.map((s) => s.id)).toContain('secret-giant-numbers');
  });

  it('mergeStreakUnlocks is add-only and idempotent', () => {
    const stats: PlayStats = { ...defaultPlayStats(), evenStreak: 10 };
    const once = mergeStreakUnlocks([], stats, []);
    expect(once.unlocked.map((s) => s.id)).toEqual(
      expect.arrayContaining(['secret-streak-even-5', 'secret-streak-even-10']),
    );
    const twice = mergeStreakUnlocks(once.collection, stats, []);
    expect(twice.unlocked.length).toBe(0);
  });
});
