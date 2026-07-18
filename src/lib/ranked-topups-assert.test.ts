import { describe, expect, it } from 'vite-plus/test';
import {
  assertTopupAllowed,
  summarizeTopupRows,
  topupSkuFromMetadata,
} from './ranked-topups';

describe('assertTopupAllowed', () => {
  it('allows first overload', () => {
    expect(
      assertTopupAllowed(
        { packBonus: 0, hasOverload: false, totalBonus: 0 },
        'overload',
      ).ok,
    ).toBe(true);
  });

  it('rejects second overload', () => {
    const r = assertTopupAllowed(
      { packBonus: 30, hasOverload: true, totalBonus: 120 },
      'overload',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('overload_already');
  });

  it('rejects pack over 90 cap', () => {
    const r = assertTopupAllowed(
      { packBonus: 60, hasOverload: false, totalBonus: 60 },
      'boost_60',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('pack_cap');
  });

  it('allows boost_30 when packBonus is 60', () => {
    expect(
      assertTopupAllowed(
        { packBonus: 60, hasOverload: false, totalBonus: 60 },
        'boost_30',
      ).ok,
    ).toBe(true);
  });
});

describe('summarizeTopupRows', () => {
  it('splits pack vs overload', () => {
    const s = summarizeTopupRows([
      { bonus: 30, overload: false },
      { bonus: 90, overload: true },
    ]);
    expect(s.packBonus).toBe(30);
    expect(s.hasOverload).toBe(true);
    expect(s.totalBonus).toBe(120);
  });
});

describe('topupSkuFromMetadata', () => {
  it('reads topup_sku', () => {
    expect(topupSkuFromMetadata({ kind: 'topup', topup_sku: 'boost_30' })).toBe(
      'boost_30',
    );
  });
});
