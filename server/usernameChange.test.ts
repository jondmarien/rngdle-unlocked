import { describe, expect, it } from 'vite-plus/test';
import {
  isUsernameChangeOnCooldown,
  normalizeDisplayName,
  usernameNextChangeAt,
  USERNAME_CHANGE_COOLDOWN_MS,
} from './usernameChange.js';

describe('normalizeDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeDisplayName('  Chrono   Rex  ')).toBe('Chrono Rex');
  });

  it('rejects too short or too long', () => {
    expect(normalizeDisplayName('a')).toBeNull();
    expect(normalizeDisplayName('x'.repeat(49))).toBeNull();
  });

  it('allows duplicates-friendly names', () => {
    expect(normalizeDisplayName('Player')).toBe('Player');
  });
});

describe('usernameNextChangeAt / cooldown', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');

  it('allows change when never changed', () => {
    expect(usernameNextChangeAt(null, now)).toBeNull();
    expect(isUsernameChangeOnCooldown(null, now)).toBe(false);
  });

  it('locks within 7 days', () => {
    const changed = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const next = usernameNextChangeAt(changed, now);
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBe(
      changed.getTime() + USERNAME_CHANGE_COOLDOWN_MS,
    );
    expect(isUsernameChangeOnCooldown(changed, now)).toBe(true);
  });

  it('allows after cooldown elapses', () => {
    const changed = new Date(now.getTime() - USERNAME_CHANGE_COOLDOWN_MS - 1);
    expect(usernameNextChangeAt(changed, now)).toBeNull();
    expect(isUsernameChangeOnCooldown(changed, now)).toBe(false);
  });
});
