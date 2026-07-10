import { describe, expect, it } from 'vite-plus/test';
import { awardDigits, rawDigitsFromRoll } from './digits';

describe('arcade digits', () => {
  it('applies rarity base + EP tail', () => {
    const raw = rawDigitsFromRoll('rare', 3500, []);
    // base 12 + floor(3500/500)=7 → 19
    expect(raw).toBe(19);
  });

  it('floor_raise treats trash as common base', () => {
    const without = rawDigitsFromRoll('trash', 0, []);
    const withFloor = rawDigitsFromRoll('trash', 0, ['floor_raise']);
    expect(without).toBe(1);
    expect(withFloor).toBe(2);
  });

  it('rare_amp multiplies rare+', () => {
    const { finalDigits } = awardDigits({
      rarity: 'rare',
      totalEP: 0,
      badgeCount: 0,
      owned: ['rare_amp'],
      comboStreakBefore: 0,
      surgeActive: false,
    });
    // base 12 * 1.5 = 18
    expect(finalDigits).toBe(18);
  });

  it('badge_magnet adds flat Digits', () => {
    const { finalDigits } = awardDigits({
      rarity: 'common',
      totalEP: 0,
      badgeCount: 3,
      owned: ['badge_magnet'],
      comboStreakBefore: 0,
      surgeActive: false,
    });
    // base 2 + 3*2 = 8
    expect(finalDigits).toBe(8);
  });

  it('resets combo streak on trash', () => {
    const { comboStreakAfter } = awardDigits({
      rarity: 'trash',
      totalEP: 0,
      badgeCount: 0,
      owned: ['combo_chain'],
      comboStreakBefore: 4,
      surgeActive: false,
    });
    expect(comboStreakAfter).toBe(0);
  });
});
