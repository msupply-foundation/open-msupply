// The way back to discovery on a shell that predates the discovery page —
// a deliberate, temporary compatibility shim.
//
// The designed way back is the hand-off parameter: the shell connects to
// `login?discovery-return=<page URL>` and the landing screen renders a link
// (src/discovery/discoveryReturn.ts, AC-DT16/23). Only a shell that carries
// the page sends it. A v3.0 or v3.1 shell navigates to the server's bare
// origin, so on those the parameter never arrives and the screen offers
// nothing at all — verified against a real v3.1 Electron shell serving this
// exact bundle: the way back was the only thing missing from it.
//
// That is not an edge case. Servers are upgraded before clients, so "new
// server, older shell" is the ordinary shape of a rollout, and without this
// every one of those users loses change-server until their shell catches up.
//
// The old front end never had the problem because it asks the SHELL rather
// than reading a URL, over a bridge those shells still have. So do the same,
// as a fallback only:
//
//   Electron  window.electronNativeAPI.goBackToDiscovery()
//             -> the shell's own webpack renderer, ?autoconnect=false
//   Android   NativeApi.goBackToDiscovery()
//             -> localUrl + "/discovery?autoconnect=false"
//
// Both land on the OLD discovery screen, not this page. That restores the
// capability, not the design, which is the right trade for a shell that was
// released before the design existed.
//
// DELETE THIS when v3.0/v3.1 shells are no longer deployed: it is the one
// place the new front end still reaches for `electronNativeAPI`, the API the
// host contract exists to replace (src/discovery/hostContract.ts).
import { isAndroid } from './index';

/** What the legacy bridges have in common — the only method wanted here. */
export type LegacyShell = { goBackToDiscovery: () => void };

type ElectronNativeApi = { goBackToDiscovery?: () => void };

// The Android bridge, as much of it as this needs. connectedServer() is the
// PROBE rather than something used: registerPlugin hands back a proxy whether
// or not the shell registered the plugin, so being on Android proves nothing
// (the same trap ./discoveryHost.ts documents — confirmed on a v3.0 shell,
// where the proxy exists and every call rejects "not implemented").
type LegacyNativeApiPlugin = {
  connectedServer: () => Promise<unknown>;
  goBackToDiscovery: () => Promise<void>;
};

declare global {
  interface Window {
    electronNativeAPI?: ElectronNativeApi;
  }
}

let androidPlugin: LegacyNativeApiPlugin | undefined;

/**
 * The legacy shell's way back, or undefined where there isn't one (a browser
 * tab, or a shell new enough to send the hand-off parameter instead).
 *
 * Callers MUST prefer the parameter when it is present
 * (src/discovery/discoveryReturn.ts § rememberedDiscoveryReturn) and only
 * fall back to this. A current shell has both, and the parameter is the one
 * that lands back on the new page with its flags intact.
 */
export const getLegacyShell = async (): Promise<LegacyShell | undefined> => {
  if (typeof window === 'undefined') return undefined;

  const electron = window.electronNativeAPI;
  if (typeof electron?.goBackToDiscovery === 'function') {
    return { goBackToDiscovery: () => electron.goBackToDiscovery?.() };
  }

  if (!isAndroid()) return undefined;
  if (!androidPlugin) {
    const { registerPlugin } = await import('@capacitor/core');
    androidPlugin = registerPlugin<LegacyNativeApiPlugin>('NativeApi');
  }
  const plugin = androidPlugin;
  const answers = await plugin
    .connectedServer()
    .then(() => true)
    .catch(() => false);
  if (!answers) {
    androidPlugin = undefined;
    return undefined;
  }
  return {
    // Fire and forget: the contract gives it no way to report, and the whole
    // WebView is about to be navigated away anyway. Logged so a broken bridge
    // is still findable.
    goBackToDiscovery: () =>
      void plugin
        .goBackToDiscovery()
        .catch((error: unknown) =>
          console.error('NativeApi.goBackToDiscovery failed', error)
        ),
  };
};
