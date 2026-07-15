import { describe, expect, it } from 'vite-plus/test';
import {
  cloudSettingsAreMeaningful,
  pickSyncableSettings,
} from './syncable-settings';
import { DEFAULT_SETTINGS } from '../state/storage';

describe('syncable settings', () => {
  it('picks allowlisted keys and fills defaults', () => {
    const picked = pickSyncableSettings({ soundEnabled: true });
    expect(picked.soundEnabled).toBe(true);
    expect(picked.confettiEnabled).toBe(DEFAULT_SETTINGS.confettiEnabled);
    expect((picked as Record<string, unknown>).howToRollOpen).toBeUndefined();
  });

  it('requires both prefs and updatedAt for meaningful cloud', () => {
    expect(cloudSettingsAreMeaningful(undefined, undefined)).toBe(false);
    expect(cloudSettingsAreMeaningful({ soundEnabled: true }, undefined)).toBe(
      false,
    );
    expect(
      cloudSettingsAreMeaningful(
        { soundEnabled: true },
        '2026-07-15T00:00:00.000Z',
      ),
    ).toBe(true);
  });
});
