import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLegacyShell } from './legacyShell';

// Resolution matrix for getLegacyShell() — the fallback way back, for shells
// released before the discovery page existed. Callers only reach it when the
// hand-off parameter is absent (ui/layout/ChangeServerAction.tsx), so every
// case here is "no parameter, what does the shell offer".
describe('getLegacyShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock('@capacitor/core');
  });

  it('is undefined with no window (node / test environment)', async () => {
    await expect(getLegacyShell()).resolves.toBeUndefined();
  });

  it('is undefined in a plain browser tab', async () => {
    vi.stubGlobal('window', {});
    await expect(getLegacyShell()).resolves.toBeUndefined();
  });

  it("resolves the legacy Electron shell's bridge", async () => {
    const goBackToDiscovery = vi.fn();
    vi.stubGlobal('window', { electronNativeAPI: { goBackToDiscovery } });
    const shell = await getLegacyShell();
    expect(shell).toBeDefined();
    shell!.goBackToDiscovery();
    expect(goBackToDiscovery).toHaveBeenCalledOnce();
  });

  // A shell can expose electronNativeAPI without this method (an older one
  // still, or a future one that drops it). Being handed an object is not
  // evidence the way back is there.
  it('ignores an Electron bridge with no way back on it', async () => {
    vi.stubGlobal('window', { electronNativeAPI: { readLog: () => {} } });
    await expect(getLegacyShell()).resolves.toBeUndefined();
  });

  // registerPlugin returns a proxy whether or not the shell registered the
  // plugin, so being on Android proves nothing — a v3.0 shell has NativeApi,
  // a browser pretending to be Android does not.
  it('is undefined on Android when no NativeApi answers', async () => {
    vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
    vi.doMock('@capacitor/core', () => ({
      registerPlugin: () => ({
        connectedServer: () => Promise.reject(new Error('not implemented')),
      }),
    }));
    const { getLegacyShell: fresh } = await import('./legacyShell');
    await expect(fresh()).resolves.toBeUndefined();
  });

  it('resolves the Android bridge when NativeApi does answer', async () => {
    const goBackToDiscovery = vi.fn(() => Promise.resolve());
    vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
    vi.doMock('@capacitor/core', () => ({
      registerPlugin: () => ({
        connectedServer: () => Promise.resolve(null),
        goBackToDiscovery,
      }),
    }));
    const { getLegacyShell: fresh } = await import('./legacyShell');
    const shell = await fresh();
    expect(shell).toBeDefined();
    shell!.goBackToDiscovery();
    expect(goBackToDiscovery).toHaveBeenCalledOnce();
  });

  // The Electron bridge wins without the Android probe ever running: a shell
  // is one or the other, and asking the bridge costs a round trip.
  it('prefers the Electron bridge over the Android one', async () => {
    const electronBack = vi.fn();
    const androidBack = vi.fn(() => Promise.resolve());
    vi.stubGlobal('window', {
      electronNativeAPI: { goBackToDiscovery: electronBack },
      Capacitor: { getPlatform: () => 'android' },
    });
    vi.doMock('@capacitor/core', () => ({
      registerPlugin: () => ({
        connectedServer: () => Promise.resolve(null),
        goBackToDiscovery: androidBack,
      }),
    }));
    const { getLegacyShell: fresh } = await import('./legacyShell');
    const shell = await fresh();
    shell!.goBackToDiscovery();
    expect(electronBack).toHaveBeenCalledOnce();
    expect(androidBack).not.toHaveBeenCalled();
  });
});
