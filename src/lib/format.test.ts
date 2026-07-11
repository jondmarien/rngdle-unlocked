import { describe, expect, it } from 'vite-plus/test';
import { formatCount } from './format';

describe('formatCount', () => {
  it('uses full grouping by default', () => {
    expect(formatCount(4827699)).toBe((4827699).toLocaleString());
  });

  it('abbreviates when compact is on', () => {
    const s = formatCount(4_827_699, { compact: true });
    expect(s).toMatch(/4\.8\s*M/i);
  });

  it('leaves small numbers readable when compact', () => {
    expect(formatCount(42, { compact: true })).toBe(
      new Intl.NumberFormat(undefined, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(42),
    );
  });
});
