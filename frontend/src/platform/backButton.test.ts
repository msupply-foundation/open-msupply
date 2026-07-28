import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerAndroidBackButton } from './backButton';

// The web/no-window cases must return without ever evaluating @capacitor/app
// (kdd/capacitor-plugins Fork 2 — plugin JS never loads off-device). The
// listener wiring itself is verified on device via pnpm dev-android.
describe('registerAndroidBackButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op with no window (node / test environment)', async () => {
    await expect(registerAndroidBackButton()).resolves.toBeUndefined();
  });

  it('is a no-op in a plain browser', async () => {
    vi.stubGlobal('window', {});
    await expect(registerAndroidBackButton()).resolves.toBeUndefined();
  });
});
