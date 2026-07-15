/**
 * Allowlisted AppSettings blob for optional cloud sync (LWW by updatedAt).
 * Gate is user_progress.settings_sync_enabled — never infer from this blob.
 */

import type { AppSettings, ThemeMode } from '../src/game/types.js';

/** Keys that may cross devices. Ephemeral UI chrome is excluded. */
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

export type CloudSettingsBlob = {
  updatedAt: string;
  prefs: SyncableSettings;
};

const THEMES = new Set<ThemeMode>(['system', 'light', 'dark']);

/** Defaults for missing syncable keys (mirrors DEFAULT_SETTINGS). */
const SYNCABLE_DEFAULTS: SyncableSettings = {
  theme: 'system',
  shareShowRollCount: true,
  soundEnabled: false,
  hapticsEnabled: true,
  confettiEnabled: true,
  trashCrackEnabled: true,
  autoScrollBadges: true,
  autoShareHighRarity: false,
  showLatestRuns: true,
  shareShowUnlockedBadges: true,
  abbreviateLargeNumbers: false,
  applyProfileAccentSiteWide: false,
};

export function pickSyncableSettings(
  settings: AppSettings | Partial<AppSettings>,
): SyncableSettings {
  const out = { ...SYNCABLE_DEFAULTS };
  for (const key of SYNCABLE_SETTINGS_KEYS) {
    const v = settings[key];
    if (v !== undefined) {
      (out as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}

export function isMeaningfulCloudSettingsJson(
  raw: string | null | undefined,
): boolean {
  return parseCloudSettingsJson(raw) != null;
}

export function parseCloudSettingsJson(
  raw: string | null | undefined,
): CloudSettingsBlob | null {
  if (raw == null || raw === '' || raw === '{}') return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return null;
    const updatedAt =
      typeof data.updatedAt === 'string' ? data.updatedAt : null;
    const prefsRaw =
      data.prefs && typeof data.prefs === 'object'
        ? (data.prefs as Record<string, unknown>)
        : null;
    if (!updatedAt || !prefsRaw) return null;
    const prefs = normalizeSyncablePrefs(prefsRaw);
    if (!prefs) return null;
    return { updatedAt, prefs };
  } catch {
    return null;
  }
}

export function serializeCloudSettingsBlob(blob: CloudSettingsBlob): string {
  return JSON.stringify({
    updatedAt: blob.updatedAt,
    prefs: pickSyncableSettings(blob.prefs),
  });
}

function normalizeSyncablePrefs(
  raw: Record<string, unknown>,
): SyncableSettings | null {
  const theme = raw.theme;
  if (
    theme != null &&
    (typeof theme !== 'string' || !THEMES.has(theme as ThemeMode))
  ) {
    return null;
  }
  const merged: Partial<AppSettings> = { ...SYNCABLE_DEFAULTS };
  for (const key of SYNCABLE_SETTINGS_KEYS) {
    if (!(key in raw)) continue;
    const v = raw[key];
    if (key === 'theme') {
      if (typeof v === 'string' && THEMES.has(v as ThemeMode)) {
        merged.theme = v as ThemeMode;
      }
      continue;
    }
    if (typeof v === 'boolean') {
      (merged as Record<string, unknown>)[key] = v;
    }
  }
  return pickSyncableSettings(merged);
}

/** LWW: prefer the side with the newer updatedAt ISO string. */
export function mergeSettingsLww(
  local: CloudSettingsBlob | null,
  cloud: CloudSettingsBlob | null,
): CloudSettingsBlob | null {
  if (!local && !cloud) return null;
  if (!local) return cloud;
  if (!cloud) return local;
  return local.updatedAt >= cloud.updatedAt ? local : cloud;
}
