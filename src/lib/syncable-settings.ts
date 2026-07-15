import type { AppSettings } from '../game/types';
import { DEFAULT_SETTINGS } from '../state/storage';

/** Must match server/syncSettings.ts SYNCABLE_SETTINGS_KEYS. */
export const SYNCABLE_SETTINGS_KEYS = [
  'theme',
  'shareShowRollCount',
  'soundEnabled',
  'hapticsEnabled',
  'confettiEnabled',
  'trashCrackEnabled',
  'autoScrollBadges',
  'autoShareHighRarity',
  'showLatestRuns',
  'shareShowUnlockedBadges',
  'abbreviateLargeNumbers',
  'applyProfileAccentSiteWide',
] as const satisfies ReadonlyArray<keyof AppSettings>;

export type SyncableSettings = Pick<
  AppSettings,
  (typeof SYNCABLE_SETTINGS_KEYS)[number]
>;

export function pickSyncableSettings(
  settings: AppSettings | Partial<AppSettings>,
): SyncableSettings {
  const out = {} as SyncableSettings;
  for (const key of SYNCABLE_SETTINGS_KEYS) {
    const v = settings[key];
    (out as Record<string, unknown>)[key] =
      v !== undefined ? v : DEFAULT_SETTINGS[key];
  }
  return out;
}

export function cloudSettingsAreMeaningful(
  settings: Partial<AppSettings> | undefined,
  updatedAt: string | undefined,
): boolean {
  return Boolean(settings && updatedAt);
}
