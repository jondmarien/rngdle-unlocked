/**
 * Single registry for the localStorage namespace. Every persisted key lives
 * here so a future version migration has exactly one place to touch.
 */

export const STORAGE_PREFIX = 'rngdle-unlocked:v1:';

export const STORAGE_KEYS = {
  history: `${STORAGE_PREFIX}history`,
  lifetimeEP: `${STORAGE_PREFIX}lifetimeEP`,
  lifetimeRollCount: `${STORAGE_PREFIX}lifetimeRollCount`,
  journeyEP: `${STORAGE_PREFIX}journeyEP`,
  collection: `${STORAGE_PREFIX}collection`,
  settings: `${STORAGE_PREFIX}settings`,
  stats: `${STORAGE_PREFIX}stats`,
  /** Anonymous challenge subject id for signed-out daily/weekly rolls. */
  guest: `${STORAGE_PREFIX}guest`,
  webNotifications: `${STORAGE_PREFIX}webNotifications`,
  onboarding: `${STORAGE_PREFIX}onboarding`,
} as const;
