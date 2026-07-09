import { describe, expect, it } from 'vite-plus/test';
import {
  CEILING_JACKPOT_ODDS,
  JACKPOT_REJECT_THRESHOLD,
  mapBytesToInclusiveRange,
  mapBytesToJackpotHit,
  REJECT_THRESHOLD,
  ROLL_MAX,
  ROLL_RANGE,
  rollNumber,
} from './rng';

function u32Bytes(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, n >>> 0, false);
  return buf;
}

describe('mapBytesToInclusiveRange', () => {
  it('maps zero to 0', () => {
    expect(mapBytesToInclusiveRange(u32Bytes(0))).toBe(0);
  });

  it('maps ROLL_RANGE - 1 to ROLL_MAX (ceiling is in the uniform range)', () => {
    expect(mapBytesToInclusiveRange(u32Bytes(ROLL_RANGE - 1))).toBe(ROLL_MAX);
    expect(mapBytesToInclusiveRange(u32Bytes(ROLL_MAX))).toBe(ROLL_MAX);
  });

  it('always returns integer in 0..ROLL_MAX for accepted samples', () => {
    for (let i = 0; i < 1000; i++) {
      const sample = (i * 9973) % REJECT_THRESHOLD;
      const n = mapBytesToInclusiveRange(u32Bytes(sample));
      expect(n).not.toBeNull();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(ROLL_MAX);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('rejects samples at or above REJECT_THRESHOLD', () => {
    expect(mapBytesToInclusiveRange(u32Bytes(REJECT_THRESHOLD))).toBeNull();
    expect(mapBytesToInclusiveRange(u32Bytes(0xffff_ffff))).toBeNull();
  });

  it('documents unbiased range size 1_000_001', () => {
    expect(ROLL_RANGE).toBe(1_000_001);
    expect(REJECT_THRESHOLD % ROLL_RANGE).toBe(0);
    expect(REJECT_THRESHOLD).toBeLessThanOrEqual(0x1_0000_0000);
  });
});

describe('mapBytesToJackpotHit', () => {
  it('hits only when residue is 0 within an unbiased block', () => {
    expect(mapBytesToJackpotHit(u32Bytes(0))).toBe(true);
    expect(mapBytesToJackpotHit(u32Bytes(CEILING_JACKPOT_ODDS))).toBe(true);
    expect(mapBytesToJackpotHit(u32Bytes(1))).toBe(false);
    expect(mapBytesToJackpotHit(u32Bytes(CEILING_JACKPOT_ODDS - 1))).toBe(
      false,
    );
  });

  it('rejects samples at or above JACKPOT_REJECT_THRESHOLD', () => {
    expect(mapBytesToJackpotHit(u32Bytes(JACKPOT_REJECT_THRESHOLD))).toBeNull();
    expect(mapBytesToJackpotHit(u32Bytes(0xffff_ffff))).toBeNull();
  });

  it('documents 1-in-100M Absolute Ceiling jackpot', () => {
    expect(CEILING_JACKPOT_ODDS).toBe(100_000_000);
    expect(JACKPOT_REJECT_THRESHOLD % CEILING_JACKPOT_ODDS).toBe(0);
  });
});

describe('rollNumber', () => {
  it('returns values in 0..ROLL_MAX', async () => {
    for (let i = 0; i < 20; i++) {
      const n = await rollNumber();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(ROLL_MAX);
      expect(Number.isInteger(n)).toBe(true);
    }
  });
});
