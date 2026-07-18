import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vite-plus/test';
import { discordPublicKeyFromHex, verifyDiscordInteraction } from './verify.js';

describe('verifyDiscordInteraction', () => {
  it('accepts a valid Ed25519 signature', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const spki = publicKey.export({ type: 'spki', format: 'der' });
    // Last 32 bytes of SPKI are the raw key
    const raw = Buffer.from(spki).subarray(-32);
    const publicKeyHex = raw.toString('hex');

    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = '{"type":1}';
    const message = Buffer.from(timestamp + rawBody, 'utf8');
    const signatureHex = sign(null, message, privateKey).toString('hex');

    expect(
      verifyDiscordInteraction({
        publicKeyHex,
        signatureHex,
        timestamp,
        rawBody,
      }),
    ).toBe(true);

    // sanity: key parses
    expect(discordPublicKeyFromHex(publicKeyHex).asymmetricKeyType).toBe(
      'ed25519',
    );
  });

  it('rejects tampered body', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const raw = Buffer.from(
      publicKey.export({ type: 'spki', format: 'der' }),
    ).subarray(-32);
    const timestamp = '123';
    const rawBody = '{"type":1}';
    const signatureHex = sign(
      null,
      Buffer.from(timestamp + rawBody, 'utf8'),
      privateKey,
    ).toString('hex');

    expect(
      verifyDiscordInteraction({
        publicKeyHex: raw.toString('hex'),
        signatureHex,
        timestamp,
        rawBody: '{"type":2}',
      }),
    ).toBe(false);
  });
});
