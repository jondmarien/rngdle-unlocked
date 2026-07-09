/** Crockford-ish alphabet (no ambiguous 0/O/1/I/l). */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Short public code for vanity URLs (8 chars ≈ 47 bits). */
export function makeShortCode(length = 8): string {
  const c = globalThis.crypto;
  const bytes = new Uint8Array(length);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = (Date.now() + i * 17) & 0xff;
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]!;
  }
  return out;
}

export function newRollId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  try {
    const b = new Uint8Array(4);
    c!.getRandomValues(b);
    const n = new DataView(b.buffer).getUint32(0, false);
    return `roll-${Date.now()}-${n.toString(16)}`;
  } catch {
    return `roll-${Date.now()}`;
  }
}

export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

/** Sanitize handle for vanity path segment. */
export function vanityUserSegment(username: string | null | undefined): string {
  const cleaned = (username ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
  return cleaned.length >= 3 ? cleaned : 'player';
}
