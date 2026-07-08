import { mixPoolInto } from './entropyPool';

/** Inclusive maximum roll value (0 … ROLL_MAX). */
export const ROLL_MAX = 1_000_000;
export const ROLL_RANGE = ROLL_MAX + 1; // 1_000_001

/**
 * Largest multiple of ROLL_RANGE that fits in 2^32.
 * Values >= this are rejected to avoid modulo bias.
 */
export const REJECT_THRESHOLD = Math.floor(0x1_0000_0000 / ROLL_RANGE) * ROLL_RANGE;

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is required for fortified rolls');
}

/** Fill buffer with CSPRNG bytes (not Math.random, not seedable). */
export function getRandomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  getCrypto().getRandomValues(buf);
  return buf;
}

/**
 * Map 4 big-endian bytes to 0..ROLL_MAX using reject sampling.
 * Returns null if the sample should be rejected (bias avoidance).
 */
export function mapBytesToInclusiveRange(bytes: Uint8Array): number | null {
  if (bytes.length < 4) {
    throw new Error('Need at least 4 bytes');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = view.getUint32(0, false);
  if (u32 >= REJECT_THRESHOLD) {
    return null;
  }
  return u32 % ROLL_RANGE;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const cryptoObj = getCrypto();
  if (!cryptoObj.subtle) {
    // Node test environments without subtle: fall back to raw bytes (still from getRandomValues)
    return bytes.slice(0, 32);
  }
  // Ensure we pass an ArrayBuffer-backed view (BufferSource)
  const copy = new Uint8Array(bytes);
  const digest = await cryptoObj.subtle.digest('SHA-256', copy);
  return new Uint8Array(digest);
}

/**
 * Produce a fortified roll in 0..ROLL_MAX:
 * fresh CSPRNG ⊕ entropy pool → SHA-256 → reject-sample.
 */
export async function rollNumber(): Promise<number> {
  for (let attempt = 0; attempt < 64; attempt++) {
    const fresh = getRandomBytes(32);
    mixPoolInto(fresh);
    const mixed = await sha256(fresh);
    const n = mapBytesToInclusiveRange(mixed);
    if (n !== null) {
      return n;
    }
  }
  // Extremely unlikely path: use last fresh sample without reject (still CSPRNG)
  const fallback = getRandomBytes(4);
  const view = new DataView(fallback.buffer);
  return view.getUint32(0, false) % ROLL_RANGE;
}

export function assertValidRollNumber(n: number): void {
  if (!Number.isInteger(n) || n < 0 || n > ROLL_MAX) {
    throw new RangeError(`Roll number must be integer in 0..${ROLL_MAX}, got ${n}`);
  }
}
