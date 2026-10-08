// Platform detection for the Capacitor Android shell (kdd/capacitor-plugins).
//
// The native shell injects `window.Capacitor` before any app script runs, in
// all three serving modes: normal bundled assets, the DEV_ANDROID server.url
// dev loop, and the future client-mode manual injection (kdd/android). On the
// web the global simply doesn't exist — unless something imports
// @capacitor/core, whose module evaluation CREATES window.Capacitor with
// platform 'web'. So the check asks the platform, never mere existence, and
// @capacitor/* imports stay confined to src/platform/ capability wrappers.
type CapacitorGlobal = {
  getPlatform: () => string;
  isNativePlatform: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

// A function, not a module-scope const: costs nothing and stays correct if a
// serving mode ever injects the bridge later than module evaluation. The
// typeof guard keeps it safe under vitest's node environment.
export const isAndroid = (): boolean =>
  typeof window !== 'undefined' &&
  window.Capacitor?.getPlatform() === 'android';
