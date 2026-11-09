import { afterEach, describe, expect, it, vi } from 'vitest';
import { staleBundleDetected, startStaleBundleWatch } from './staleBundle';

// staleBundle.ts is browser-only (window, sessionStorage, location) — the
// vitest environment is node (vitest.config.ts), so all three are stubbed
// per test rather than switching the whole suite to jsdom for one file.
const stubBrowserGlobals = () => {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  const reload = vi.fn();
  vi.stubGlobal('location', { reload });

  const listeners = new Map<string, (event: Event) => void>();
  vi.stubGlobal('window', {
    addEventListener: (type: string, listener: (event: Event) => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  });
  const dispatchPreloadError = () => {
    const event = { preventDefault: vi.fn(), defaultPrevented: false };
    listeners.get('vite:preloadError')?.(event as unknown as Event);
    return event;
  };

  return { reload, dispatchPreloadError };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('startStaleBundleWatch', () => {
  // staleBundleDetected has no reset export (by design — production only
  // ever moves it false → true, recovered by a full reload), so the
  // already-detected case runs last.
  it('reloads once, silently, on the first vite:preloadError this tab has seen', () => {
    const { reload, dispatchPreloadError } = stubBrowserGlobals();
    startStaleBundleWatch();

    const event = dispatchPreloadError();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(staleBundleDetected()).toBe(false);
  });

  it('stops reacting once the returned cleanup has run', () => {
    const { reload, dispatchPreloadError } = stubBrowserGlobals();
    const stop = startStaleBundleWatch();
    stop();

    dispatchPreloadError();

    expect(reload).not.toHaveBeenCalled();
  });

  it('shows the stuck-bundle signal instead of reloading again if the flag is already set', () => {
    const { reload, dispatchPreloadError } = stubBrowserGlobals();
    sessionStorage.setItem('staleBundleReloaded', '1');
    startStaleBundleWatch();

    const event = dispatchPreloadError();

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(staleBundleDetected()).toBe(true);
  });
});
