import { describe, expect, it } from 'vite-plus/test';
import { buildFlavorQuote, buildShareText } from './shareText';
import type { BadgeHit, RollResult } from './types';

function badge(partial: Partial<BadgeHit> & { name: string; ep: number }): BadgeHit {
  return {
    id: partial.id ?? partial.name,
    name: partial.name,
    description: '',
    ep: partial.ep,
    family: 'math',
    emoji: partial.emoji ?? '🎲',
    highlights: [],
    rarity: partial.rarity ?? 'common',
  };
}

const sample: RollResult = {
  id: 'x',
  number: 473389,
  totalEP: 3179,
  rarity: 'common',
  percentile: 40,
  rolledAt: new Date().toISOString(),
  badges: [
    badge({ name: 'Lucky Seven', emoji: '🎰', ep: 90 }),
    badge({ name: 'Oxygen (8)', emoji: '🫧', ep: 280 }),
    badge({ name: 'Beryllium (4)', emoji: '💚', ep: 280 }),
    badge({ name: 'Even Keel', emoji: '⚖️', ep: 8 }),
    badge({ name: 'Void', emoji: '⚫', ep: 28 }),
  ],
};

describe('buildShareText', () => {
  it('matches Discord paste shape', () => {
    const text = buildShareText(sample, {
      siteUrl: 'https://example.com',
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('RNGdle Unlocked 🎲 473389');
    expect(lines).toContain('⬜ COMMON');
    expect(text).toContain('⬜ 🎰 Lucky Seven');
    expect(text).toContain('+2 more');
    expect(text).toMatch(/^".+"$/m);
    expect(text).toContain('3,179 EP');
    expect(text.trim().endsWith('https://example.com')).toBe(true);
  });

  it('handles no badges', () => {
    const text = buildShareText({ ...sample, badges: [] }, { siteUrl: 'https://x.test' });
    expect(text).toContain('⬜ (no badges)');
  });
});

describe('buildFlavorQuote', () => {
  it('returns a non-empty lowercase phrase', () => {
    const q = buildFlavorQuote(sample.badges);
    expect(q.length).toBeGreaterThan(5);
    expect(q).toBe(q.toLowerCase());
  });
});
