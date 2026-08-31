// Resolving THE discovery host (src/discovery/hostContract.ts) — the one
// place that knows which shell is answering, so the page itself never asks
// "which platform am I on":
// - a shell that can inject (the Electron preload; entry.tsx's dev mock)
//   provides `window.discoveryHostApi` directly, and it wins;
// - the Android shell answers through the DiscoveryHost Capacitor plugin
//   (android/.../DiscoveryHostPlugin.java — NsdManager browse, bounded answer
//   check, WebView navigation). Adapted here, not in src/discovery, because
//   @capacitor/* imports stay confined to src/platform/ capability wrappers
//   (./index.ts — importing @capacitor/core CREATES window.Capacitor on the
//   web, so the platform check comes first and the module is imported lazily
//   INSIDE the function, the readServerLog.ts convention);
// - otherwise there is no host (a plain browser tab): undefined, and the page
//   states it rather than searching nothing (DiscoveryPage's no-host notice).
import { isAndroid } from './index';
import type {
  DiscoveryHostApi,
  HostInfo,
  RawAnnouncement,
} from '../discovery/hostContract';

// The plugin's own wire shape: every Capacitor method returns a promise and
// takes one options object; the adapter below flattens both back to the
// contract.
type DiscoveryHostPlugin = {
  hostInfo: () => Promise<HostInfo>;
  startDiscovery: () => Promise<void>;
  announcements: () => Promise<{ announcements: RawAnnouncement[] }>;
  probe: (options: {
    url: string;
    timeoutMs: number;
  }) => Promise<{ answered: boolean }>;
  navigate: (options: { url: string }) => Promise<void>;
};

let plugin: DiscoveryHostPlugin | undefined;

export const getDiscoveryHost = async (): Promise<
  DiscoveryHostApi | undefined
> => {
  if (typeof window === 'undefined') return undefined;
  if (window.discoveryHostApi) return window.discoveryHostApi;
  if (!isAndroid()) return undefined;
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core');
    plugin = registerPlugin<DiscoveryHostPlugin>('DiscoveryHost');
  }
  const p = plugin;
  // The two fire-and-forget methods swallow their own failures: the contract
  // gives them no way to report one (both return void), and an uncaught
  // bridge rejection would surface as an unhandled promise rejection in the
  // page instead. Logged so a broken bridge is still findable.
  const fireAndForget = (method: string, call: Promise<void>): void => {
    void call.catch((error: unknown) =>
      console.error(`DiscoveryHost.${method} failed`, error)
    );
  };
  return {
    hostInfo: () => p.hostInfo(),
    startDiscovery: () => fireAndForget('startDiscovery', p.startDiscovery()),
    announcements: () => p.announcements(),
    probe: async (url, timeoutMs) =>
      (await p.probe({ url, timeoutMs })).answered,
    navigate: url => fireAndForget('navigate', p.navigate({ url })),
  };
};
