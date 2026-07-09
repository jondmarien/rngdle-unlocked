import { ROLL_MAX } from './rng';

/** Max possible digit count for a roll (1_000_000 → 7). */
export const DISPLAY_WIDTH = String(ROLL_MAX).length;

/**
 * Natural decimal form of a roll — no leading-zero padding.
 *
 * Uniform RNG over 0…1_000_000 rarely hits 7-digit values (only 1_000_000),
 * so padding everything to 7 made almost every reel start with "0" and look broken.
 *
 * Zeros that are *part of* the number (e.g. 100, 1000000, or 0 itself) are kept.
 */
export function formatRollDigits(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > ROLL_MAX) {
    return String(Math.trunc(Math.abs(n)));
  }
  return String(n);
}

/** Alias — same as formatRollDigits (natural form). */
export function naturalDigits(n: number): string {
  return formatRollDigits(n);
}

export function naturalDigitLength(n: number): number {
  return naturalDigits(n).length;
}
