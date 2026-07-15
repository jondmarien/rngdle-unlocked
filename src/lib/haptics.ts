/** Named Vibration API presets — short, purposeful pulses only. */
export const HAPTIC_PATTERNS = {
  tap: 10,
  reveal: 15,
  success: [10, 30, 10],
  error: [20, 40, 20],
} as const;

export type HapticKind = keyof typeof HAPTIC_PATTERNS;

/**
 * Fire a named haptic pattern when enabled and the Vibration API is present.
 * Silent no-op on unsupported browsers (incl. all Safari) and when disabled.
 * Prefer calling from a synchronous user-gesture handler on Chrome/Android.
 */
export function haptic(kind: HapticKind, enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    const pattern = HAPTIC_PATTERNS[kind];
    navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    // ignore — some environments expose vibrate but reject calls
  }
}
