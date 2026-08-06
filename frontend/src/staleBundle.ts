import { createSignal } from 'solid-js';

// Spec (issue #496): the CI/demo server redeploys a fresh build while a
// browser tab is still open on the old one. Every route/modal is a
// lazy(() => import('./chunk')) whose URL is content-hashed
// (chunk-HASH.js) — once a new build lands, the old hash 404s. Navigating
// to a not-yet-visited chunk after that throws, and the router leaves the
// content area blank with no path back to a working state short of a manual
// reload (the exact symptom reported).
//
// Vite's own build output already detects this class of failure for us —
// every generated import() is wrapped so a rejected dynamic import (or a
// failed CSS/modulepreload fetch) dispatches a `vite:preloadError` window
// event with the original error as `event.payload`, instead of leaving each
// call site to notice a rejection itself. That sidesteps matching on the
// error's message text, which is a browser (V8) string, not part of the
// page's own i18n — its wording isn't guaranteed stable across engines and
// isn't guaranteed to even be in English (see MDN on Error.message: content
// is implementation-defined). See
// https://vite.dev/guide/build.html#load-error-handling.
//
// First failure this tab has seen: reload immediately (defaultPrevented, so
// the triggering import resolves quietly instead of throwing into whatever
// awaited it — moot anyway, since the reload below tears the page down). A
// reload always fetches index.html fresh, which points at the new build's
// chunks, so this silently resolves the common case (one stale tab, one
// redeploy). A failure again right after that reload means the chunk is
// still unreachable for some other reason (offline, server down) —
// reloading forever would loop, so instead this leaves the error to
// propagate and shows a message telling the user a new version is available
// and to refresh, with a manual action.
//
// The proactive counterpart is appUpdate.ts: a bundle swapped by front-end
// sync RETAINS the old assets, so nothing here ever fires — that case is
// detected by polling the served version instead. The two surfaces are
// deliberately different: this one interrupts (blocking, non-dismissable)
// because the app is already broken and no user choice can fix it; the update
// prompt is a quiet footer cell because everything still works and only a
// reload the user didn't choose could destroy their in-progress work.
const RELOAD_FLAG = 'staleBundleReloaded';

const [staleBundleDetected, setStaleBundleDetected] = createSignal(false);
export { staleBundleDetected };

export const reloadForStaleBundle = (): void => {
  location.reload();
};

// Called once from App.tsx's onMount (mirroring startActivityTracking) rather
// than registered as an import-time side effect, so importing this module
// (e.g. from a test) never touches `window` on its own.
export const startStaleBundleWatch = (): (() => void) => {
  const onPreloadError = (event: Event) => {
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      event.preventDefault();
      reloadForStaleBundle();
    } else {
      setStaleBundleDetected(true);
    }
  };
  window.addEventListener('vite:preloadError', onPreloadError);
  return () => window.removeEventListener('vite:preloadError', onPreloadError);
};
