import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DiscoveryHostApi } from '../discovery/hostContract';
import { getDiscoveryHost } from './discoveryHost';

// Resolution matrix for getDiscoveryHost() — the one place that decides which
// shell (if any) is answering the discovery page. The node test environment
// has no window at all — the first case is the real default. The Android
// (Capacitor plugin) branch is device-verified per kdd/capacitor-plugins, not
// simulated here.
describe('getDiscoveryHost', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock('@capacitor/core');
  });

  it('is undefined with no window (node / test environment)', async () => {
    await expect(getDiscoveryHost()).resolves.toBeUndefined();
  });

  it('is undefined in a plain browser tab (no shell injected anything)', async () => {
    vi.stubGlobal('window', {});
    await expect(getDiscoveryHost()).resolves.toBeUndefined();
  });

  // The Android branch: `registerPlugin` returns a proxy whether or not the
  // shell registered the plugin, so being on Android proves nothing. An older
  // shell serving this page has no DiscoveryHost, and the page must state
  // "no host" rather than render a chooser over a bridge that rejects
  // everything.
  it('is undefined on Android when no DiscoveryHost plugin answers', async () => {
    vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
    vi.doMock('@capacitor/core', () => ({
      registerPlugin: () => ({
        hostInfo: () => Promise.reject(new Error('not implemented')),
      }),
    }));
    const { getDiscoveryHost: fresh } = await import('./discoveryHost');
    await expect(fresh()).resolves.toBeUndefined();
  });

  it('resolves an Android host when the plugin does answer', async () => {
    vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
    vi.doMock('@capacitor/core', () => ({
      registerPlugin: () => ({
        hostInfo: () =>
          Promise.resolve({
            platform: 'android',
            hardwareId: 'ID',
            lanAddresses: [],
          }),
      }),
    }));
    const { getDiscoveryHost: fresh } = await import('./discoveryHost');
    const host = await fresh();
    expect(host).toBeDefined();
    await expect(host!.hostInfo()).resolves.toMatchObject({
      platform: 'android',
    });
  });

  it('resolves an injected host (Electron preload, dev mock)', async () => {
    const injected = { navigate: () => {} } as unknown as DiscoveryHostApi;
    vi.stubGlobal('window', { discoveryHostApi: injected });
    await expect(getDiscoveryHost()).resolves.toBe(injected);
  });
});
