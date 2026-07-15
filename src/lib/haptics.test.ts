import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { haptic, HAPTIC_PATTERNS } from './haptics';

describe('haptic', () => {
  const vibrate = vi.fn();

  beforeEach(() => {
    vibrate.mockReset();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { vibrate },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals?.();
  });

  it('no-ops when disabled', () => {
    haptic('tap', false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('calls vibrate with named pattern when enabled', () => {
    haptic('tap', true);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
    haptic('success', true);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.success);
  });

  it('no-ops when vibrate is missing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    expect(() => haptic('reveal', true)).not.toThrow();
  });
});
