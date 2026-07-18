import { describe, expect, it } from 'vite-plus/test';
import {
  createDiscordInstallState,
  isGuildInstallContext,
  parseDiscordInstallState,
} from './guildInstall.js';

describe('discord guild install helpers', () => {
  it('round-trips signed install state', () => {
    const now = 1_700_000_000_000;
    const state = createDiscordInstallState('user-1', { now });
    const parsed = parseDiscordInstallState(state, now + 1000);
    expect(parsed).toEqual({
      ok: true,
      userId: 'user-1',
      bypassRare: false,
    });
  });

  it('round-trips ops bypass grant state', () => {
    const now = 1_700_000_000_000;
    const state = createDiscordInstallState('user-2', {
      now,
      bypassRare: true,
      ttlMs: 24 * 60 * 60 * 1000,
    });
    const parsed = parseDiscordInstallState(state, now + 1000);
    expect(parsed).toEqual({
      ok: true,
      userId: 'user-2',
      bypassRare: true,
    });
  });

  it('rejects expired or tampered state', () => {
    const now = 1_700_000_000_000;
    const state = createDiscordInstallState('user-1', { now });
    expect(parseDiscordInstallState(state, now + 16 * 60 * 1000).ok).toBe(
      false,
    );
    const parts = state.split('.');
    const sig = parts[3]!;
    const flipped = `${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`;
    expect(
      parseDiscordInstallState(
        `${parts[0]}.${parts[1]}.${parts[2]}.${flipped}`,
        now + 1000,
      ).ok,
    ).toBe(false);
  });

  it('detects guild vs user install context', () => {
    expect(
      isGuildInstallContext({
        authorizing_integration_owners: { '0': 'guild-1' },
        guild_id: 'guild-1',
      }),
    ).toBe(true);
    expect(
      isGuildInstallContext({
        authorizing_integration_owners: { '1': 'user-snowflake' },
        guild_id: 'guild-1',
      }),
    ).toBe(false);
    expect(isGuildInstallContext({ guild_id: 'guild-1' })).toBe(true);
    expect(isGuildInstallContext({})).toBe(false);
  });
});
