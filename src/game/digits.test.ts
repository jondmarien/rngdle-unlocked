import { describe, expect, it } from 'vite-plus/test';
import { DISPLAY_WIDTH, formatRollDigits } from './digits';
import { ROLL_MAX } from './rng';

describe('formatRollDigits', () => {
  it('uses fixed width for the full range', () => {
    expect(DISPLAY_WIDTH).toBe(String(ROLL_MAX).length);
    expect(DISPLAY_WIDTH).toBe(7);
  });

  it('keeps leading zeros instead of dropping them', () => {
    expect(formatRollDigits(42)).toBe('0000042');
    expect(formatRollDigits(0)).toBe('0000000');
    expect(formatRollDigits(356773)).toBe('0356773');
  });

  it('does not truncate the ceiling value', () => {
    expect(formatRollDigits(1_000_000)).toBe('1000000');
  });

  it('never strips a start digit of 0', () => {
    const s = formatRollDigits(7);
    expect(s[0]).toBe('0');
    expect(s.endsWith('7')).toBe(true);
    expect(s).toHaveLength(7);
  });
});
