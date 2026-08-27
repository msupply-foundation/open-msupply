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
  });

  it('is undefined with no window (node / test environment)', async () => {
    await expect(getDiscoveryHost()).resolves.toBeUndefined();
  });

  it('is undefined in a plain browser tab (no shell injected anything)', async () => {
    vi.stubGlobal('window', {});
    await expect(getDiscoveryHost()).resolves.toBeUndefined();
  });

  it('resolves an injected host (Electron preload, dev mock)', async () => {
    const injected = { navigate: () => {} } as unknown as DiscoveryHostApi;
    vi.stubGlobal('window', { discoveryHostApi: injected });
    await expect(getDiscoveryHost()).resolves.toBe(injected);
  });
});
