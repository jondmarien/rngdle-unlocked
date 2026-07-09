import { ROLL_MAX } from './rng';

/**
 * Fixed reel width: enough digits to write ROLL_MAX (1_000_000 → 7).
 * Smaller rolls are zero-padded on the left so a leading 0 is visible and counted.
 */
export const DISPLAY_WIDTH = String(ROLL_MAX).length;

/**
 * Canonical digit string for display + digit-pattern analysis.
 * Examples: 42 → "0000042", 0 → "0000000", 1000000 → "1000000".
 * Leading zeros are kept — never stripped.
 */
export function formatRollDigits(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > ROLL_MAX) {
    // Callers should validate; still avoid throwing in UI paths
    return String(Math.trunc(Math.abs(n))).padStart(DISPLAY_WIDTH, '0').slice(-DISPLAY_WIDTH);
  }
  return String(n).padStart(DISPLAY_WIDTH, '0');
}

/** Unpadded decimal form (magnitude / “how big is this integer?”). */
export function naturalDigits(n: number): string {
  return String(n);
}

export function naturalDigitLength(n: number): number {
  return naturalDigits(n).length;
}
