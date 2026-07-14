import type { AppSettings, ThemeMode } from '../game/types';

export type SettingsAction =
  | { type: 'setTheme'; value: ThemeMode }
  | { type: 'setShareShowRollCount'; value: boolean }
  | { type: 'setSoundEnabled'; value: boolean }
  | { type: 'setConfettiEnabled'; value: boolean }
  | { type: 'setTrashCrackEnabled'; value: boolean }
  | { type: 'setAutoScrollBadges'; value: boolean }
  | { type: 'setAutoShareHighRarity'; value: boolean }
  | { type: 'setShowLatestRuns'; value: boolean }
  | { type: 'setLatestRunsSpoilersHidden'; value: boolean }
  | { type: 'setShareShowUnlockedBadges'; value: boolean }
  | { type: 'setAbbreviateLargeNumbers'; value: boolean }
  | { type: 'setApplyProfileAccentSiteWide'; value: boolean }
  | { type: 'setHowToRollOpen'; value: boolean };

/** Pure reducer behind the near-identical settings setters. */
export function settingsReducer(
  settings: AppSettings,
  action: SettingsAction,
): AppSettings {
  switch (action.type) {
    case 'setTheme':
      return { ...settings, theme: action.value };
    case 'setShareShowRollCount':
      return { ...settings, shareShowRollCount: action.value };
    case 'setSoundEnabled':
      return { ...settings, soundEnabled: action.value };
    case 'setConfettiEnabled':
      return { ...settings, confettiEnabled: action.value };
    case 'setTrashCrackEnabled':
      return { ...settings, trashCrackEnabled: action.value };
    case 'setAutoScrollBadges':
      return { ...settings, autoScrollBadges: action.value };
    case 'setAutoShareHighRarity':
      return { ...settings, autoShareHighRarity: action.value };
    case 'setShowLatestRuns':
      return { ...settings, showLatestRuns: action.value };
    case 'setLatestRunsSpoilersHidden':
      return { ...settings, latestRunsSpoilersHidden: action.value };
    case 'setShareShowUnlockedBadges':
      return { ...settings, shareShowUnlockedBadges: action.value };
    case 'setAbbreviateLargeNumbers':
      return { ...settings, abbreviateLargeNumbers: action.value };
    case 'setApplyProfileAccentSiteWide':
      return { ...settings, applyProfileAccentSiteWide: action.value };
    case 'setHowToRollOpen':
      return { ...settings, howToRollOpen: action.value };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
