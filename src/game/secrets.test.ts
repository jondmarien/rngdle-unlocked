import { describe, expect, it } from 'vite-plus/test';
import { NUMBER_BADGES } from './badges/catalog';
import { JOURNEY_BADGES } from './journey';
import {
  OMEGA_SECRET,
  SECTION_SECRETS,
  isSectionComplete,
  mergeSecretUnlocks,
  newlyUnlockedSecrets,
  sectionProgress,
} from './secrets';

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
      ...SECTION_SECRETS.map((s) => s.id),
    ]);
    const nu = newlyUnlockedSecrets(ids);
    // all section secrets already in set → only omega if missing
    expect(nu.map((s) => s.id)).toEqual([OMEGA_SECRET.id]);
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
});
