/**
 * Discord Interactions Ed25519 verification (Node native crypto).
 */
import { createPublicKey, verify } from 'node:crypto';

/** Convert hex-encoded Discord public key to a KeyObject. */
export function discordPublicKeyFromHex(hex: string) {
  const key = Buffer.from(hex.trim(), 'hex');
  if (key.length !== 32) {
    throw new Error('DISCORD_PUBLIC_KEY must be 32 bytes hex');
  }
  return createPublicKey({
    key: Buffer.concat([
      // SPKI prefix for raw Ed25519 public key (RFC 8410)
      Buffer.from('302a300506032b6570032100', 'hex'),
      key,
    ]),
    format: 'der',
    type: 'spki',
  });
}

/**
 * Verify Discord interaction signature.
 * @see https://discord.com/developers/docs/interactions/overview
 */
export function verifyDiscordInteraction(opts: {
  publicKeyHex: string;
  signatureHex: string;
  timestamp: string;
  rawBody: string;
}): boolean {
  try {
    const key = discordPublicKeyFromHex(opts.publicKeyHex);
    const sig = Buffer.from(opts.signatureHex, 'hex');
    const message = Buffer.from(opts.timestamp + opts.rawBody, 'utf8');
    return verify(null, message, key, sig);
  } catch {
    return false;
  }
}
