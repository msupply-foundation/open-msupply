import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAndroid } from './index';

// Detection matrix for isAndroid() (kdd/capacitor-plugins Fork 1). The node
// test environment has no window at all — the first case is the real default.
describe('isAndroid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false with no window (node / test environment)', () => {
    expect(isAndroid()).toBe(false);
  });

  it('is false in a plain browser (window without Capacitor)', () => {
    vi.stubGlobal('window', {});
    expect(isAndroid()).toBe(false);
  });

  it("is false when @capacitor/core created the global on web (platform 'web')", () => {
    // Importing @capacitor/core anywhere creates window.Capacitor answering
    // 'web' — existence alone must never read as native.
    vi.stubGlobal('window', {
      Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false },
    });
    expect(isAndroid()).toBe(false);
  });

  it('is true under the native shell', () => {
    vi.stubGlobal('window', {
      Capacitor: {
        getPlatform: () => 'android',
        isNativePlatform: () => true,
      },
    });
    expect(isAndroid()).toBe(true);
  });
});
