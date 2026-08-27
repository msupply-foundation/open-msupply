// Resolving THE discovery host (src/discovery/hostContract.ts) — the one
// place that knows which shell is answering, so the page itself never asks
// "which platform am I on":
// - a shell that can inject (the Electron preload; entry.tsx's dev mock)
//   provides `window.discoveryHostApi` directly, and it wins;
// - the Android shell answers through a Capacitor plugin — that branch lands
//   with the shells (the Electron/Android hosts PR), following the
//   readServerLog.ts wrapper convention: isAndroid() first, @capacitor/core
//   imported lazily INSIDE the function (module evaluation would CREATE
//   window.Capacitor — src/platform/index.ts), the plugin proxy cached;
// - otherwise there is no host (a plain browser tab): undefined, and the page
//   states it rather than searching nothing (DiscoveryPage's no-host notice).
//
// Async even while it only reads a global, so callers keep their shape when
// the lazy Android branch joins.
import type { DiscoveryHostApi } from '../discovery/hostContract';

export const getDiscoveryHost = async (): Promise<
  DiscoveryHostApi | undefined
> => (typeof window === 'undefined' ? undefined : window.discoveryHostApi);
