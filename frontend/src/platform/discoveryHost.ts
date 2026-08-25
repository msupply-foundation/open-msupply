// The Android adapter for the desktop-host bridge (src/desktop/hostBridge.ts):
// the same contract the electron shell exposes as window.electronNativeAPI,
// answered on Android by the NativeApi Capacitor plugin
// (android/.../NativeApiPlugin.java — NsdManager browse, bounded answer
// check, WebView navigation). Lives here, not in src/desktop, because
// @capacitor/* imports stay confined to src/platform/ capability wrappers
// (./index.ts — importing @capacitor/core CREATES window.Capacitor on the
// web, so the platform check must come first and the plugin handle is built
// lazily).
import { registerPlugin } from '@capacitor/core';
import { isAndroid } from './index';
import type {
  ConnectionResult,
  DesktopHostApi,
  FrontEndHost,
} from '../desktop/hostBridge';

// The plugin's own wire shape: every Capacitor method returns a promise, and
// a "null" result is an empty object rather than null.
type NativeApiPlugin = {
  startServerDiscovery: () => Promise<void>;
  discoveredServers: () => Promise<{ servers: FrontEndHost[] }>;
  connectToServer: (server: FrontEndHost) => Promise<ConnectionResult>;
  connectedServer: () => Promise<{ server?: FrontEndHost }>;
  goBackToDiscovery: () => Promise<void>;
};

let plugin: NativeApiPlugin | undefined;
const nativeApi = (): NativeApiPlugin =>
  (plugin ??= registerPlugin<NativeApiPlugin>('NativeApi'));

/** The desktop-host contract, answered by the Android shell — undefined
 * anywhere but the Android app (a browser tab, the electron shell, node). */
export const androidDesktopHost = (): DesktopHostApi | undefined =>
  !isAndroid()
    ? undefined
    : {
        startServerDiscovery: () => void nativeApi().startServerDiscovery(),
        discoveredServers: () => nativeApi().discoveredServers(),
        connectToServer: server => nativeApi().connectToServer(server),
        connectedServer: async () =>
          (await nativeApi().connectedServer()).server ?? null,
        goBackToDiscovery: () => void nativeApi().goBackToDiscovery(),
      };
