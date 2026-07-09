/**
 * Optional roll attestation (feature 4).
 * HMAC seal proves the server saw this (userId, rollId, number, totalEp, rolledAt)
 * at attestation time — not that the client RNG was honest.
 */

function secret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.ATTEST_SECRET ||
    'dev-only-attest-secret'
  );
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type AttestPayload = {
  userId: string;
  rollId: string;
  number: number;
  totalEp: number;
  rolledAt: string;
};

export function attestMaterial(p: AttestPayload): string {
  return [
    p.userId,
    p.rollId,
    String(p.number),
    String(p.totalEp),
    p.rolledAt,
  ].join('|');
}

export async function createAttestationSeal(p: AttestPayload): Promise<string> {
  return hmacSha256Hex(secret(), attestMaterial(p));
}

export async function verifyAttestationSeal(
  p: AttestPayload,
  seal: string,
): Promise<boolean> {
  const expected = await createAttestationSeal(p);
  if (expected.length !== seal.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ seal.charCodeAt(i);
  }
  return ok === 0;
}
