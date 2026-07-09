const KEY = 'rngdle-unlocked:v1:onboarding';

export type OnboardingState = {
  /** User dismissed the post-first-roll account tip. */
  dismissedAccountTip: boolean;
  /** First roll ever completed on this device. */
  hasRolledOnce: boolean;
};

const DEFAULT: OnboardingState = {
  dismissedAccountTip: false,
  hasRolledOnce: false,
};

export function loadOnboarding(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<OnboardingState>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveOnboarding(
  partial: Partial<OnboardingState>,
): OnboardingState {
  const next = { ...loadOnboarding(), ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
