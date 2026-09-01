import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAndroidBackButton } from './backButton';

// Mock the Capacitor App plugin backButton registers against, so the listener's
// decision is testable off-device (the approach readServerLog.test.ts takes
// with @capacitor/core). The bridge itself is still verified via pnpm
// dev-android; what's covered here is which action each history position takes.
const minimizeApp = vi.fn();
const addListener = vi.fn();
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) => addListener(...args),
    minimizeApp: () => minimizeApp(),
  },
}));

// A window carrying a Capacitor bridge reporting the android platform — what
// isAndroid() keys off (mirrors openDocument's device tests). `navigation` is
// the Navigation API surface backButton reads; only currentEntry.index matters.
const back = vi.fn();
const androidWindow = (index: number | undefined) => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
  history: { back },
  navigation: index === undefined ? undefined : { currentEntry: { index } },
});

// Register on android at `bootIndex`, then fire back from `atIndex` — moving
// the history position in between, as a real navigation would.
const pressBack = async (
  bootIndex: number | undefined,
  atIndex = bootIndex
): Promise<void> => {
  vi.stubGlobal('window', androidWindow(bootIndex));
  await registerAndroidBackButton();
  vi.stubGlobal('window', androidWindow(atIndex));
  const [event, listener] = addListener.mock.calls[0] as [string, () => void];
  expect(event).toBe('backButton');
  listener();
};

describe('registerAndroidBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The web/no-window cases must return without ever evaluating @capacitor/app
  // (kdd/capacitor-plugins Fork 2 — plugin JS never loads off-device).
  it('is a no-op with no window (node / test environment)', async () => {
    await expect(registerAndroidBackButton()).resolves.toBeUndefined();
    expect(addListener).not.toHaveBeenCalled();
  });

  it('is a no-op in a plain browser', async () => {
    vi.stubGlobal('window', {});
    await expect(registerAndroidBackButton()).resolves.toBeUndefined();
    expect(addListener).not.toHaveBeenCalled();
  });

  // The reported bug (#857.1): the APK's loader page sits below our first
  // entry, so the WebView's canGoBack is true there and back used to leave the
  // app. At the boot index the app owns no step to go back to, whatever the
  // WebView says.
  it('minimises at the boot index — the app owns no step below it', async () => {
    await pressBack(1);
    expect(minimizeApp).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });

  it('minimises at the boot index when the app booted at index 0', async () => {
    await pressBack(0);
    expect(minimizeApp).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });

  it('goes back once the app has navigated above the boot index', async () => {
    await pressBack(1, 2);
    expect(back).toHaveBeenCalledOnce();
    expect(minimizeApp).not.toHaveBeenCalled();
  });

  // Defensive: a position below the baseline is not the app's to navigate
  // either — only "above" earns a history step.
  it('minimises below the boot index', async () => {
    await pressBack(2, 1);
    expect(minimizeApp).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });

  // No Navigation API (below the supported floor, or the node environment):
  // both reads fall back to 0, so back never leaves the app.
  it('minimises when the Navigation API is absent', async () => {
    await pressBack(undefined);
    expect(minimizeApp).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });
});
