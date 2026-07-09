import { describe, expect, it } from 'vite-plus/test';
import { DISPLAY_WIDTH, formatRollDigits } from './digits';
import { ROLL_MAX } from './rng';

describe('formatRollDigits', () => {
  it('documents max reel width without forcing pad', () => {
    expect(DISPLAY_WIDTH).toBe(String(ROLL_MAX).length);
    expect(DISPLAY_WIDTH).toBe(7);
  });

  it('uses natural digits — no fake leading zeros', () => {
    expect(formatRollDigits(42)).toBe('42');
    expect(formatRollDigits(356773)).toBe('356773');
    expect(formatRollDigits(1000000)).toBe('1000000');
  });

  it('keeps real zeros that belong to the number', () => {
    expect(formatRollDigits(0)).toBe('0');
    expect(formatRollDigits(100)).toBe('100');
    expect(formatRollDigits(1000000)).toBe('1000000');
  });

  it('lets leading digits vary with the RNG (not always 0)', () => {
    // Uniform samples should include non-zero first digits when unpadded
    const samples = [7, 42, 356773, 900000, 1000000].map(formatRollDigits);
    expect(samples.every((s) => s.startsWith('0'))).toBe(false);
    expect(formatRollDigits(356773)[0]).toBe('3');
  });
});
