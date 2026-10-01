/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import { App } from './App';
import { registerAndroidBackButton } from './platform/backButton';
import { refreshScanSources } from './platform/barcodeScanner';
import { watchHidDevices } from './platform/barcodeSources/webHid';
import { watchDesktopHid } from './platform/barcodeSources/desktopHid';

const root = document.getElementById('root')!;

// Android shell only (no-op elsewhere): hardware back navigates history
// instead of closing the app.
void registerAndroidBackButton();

// Resolve which barcode input this device has, once, before any screen asks
// (spec/barcode-scanning/rules.md § Triggering a scan: an affordance is
// hidden entirely where no scanner exists, so the answer has to be in hand by
// first render). Asynchronous because a plugin has to be questioned; screens
// read the cached answer synchronously. Re-asked by the Devices settings
// toggles and on entering the Test scanner page.
void refreshScanSources();

// ...and re-ask whenever a USB device is plugged in or pulled out, so a
// scanner unplugged mid-session stops reading as connected. Wired here, at
// the composition root, because the transport that knows about HID events
// must not reach back into the wrapper that owns source resolution.
watchHidDevices(() => void refreshScanSources());
// The desktop app's native scanner says the same through its shell: paired,
// forgotten, or pulled out while armed.
watchDesktopHid(() => void refreshScanSources());

/*
 * Dev-only component showcase: opening the app at #/showcase(/<section>)
 * renders the showcase instead of the app (no auth/backend needed). The
 * dynamic import sits inside a statically-false branch in production builds
 * (import.meta.env.DEV → false), so the whole src/ui-showcase/ tree is
 * dead-code-eliminated — no showcase chunk is emitted at all. Crossing the
 * showcase/app boundary takes a reload; sections inside the showcase still
 * switch live. See src/ui-showcase/README.md.
 */
/*
 * Dev-only design prototypes: opening the app at #/prototypes(/<id>) renders
 * the prototypes area instead of the app. Same mechanism, same guarantees and
 * same reasons as the showcase branch below — a statically-false branch in
 * production, so the whole src/prototypes/ tree is dead-code-eliminated and no
 * chunk is emitted. See src/prototypes/README.md.
 */
if (import.meta.env.DEV && window.location.hash.startsWith('#/prototypes')) {
  void Promise.all([
    import('./prototypes/PrototypesApp'),
    import('./intl').then(({ initialiseLocale, detectLocale }) =>
      initialiseLocale(detectLocale())
    ),
  ]).then(([{ PrototypesApp }]) => {
    render(() => <PrototypesApp />, root);
  });
} else if (import.meta.env.DEV && window.location.hash.startsWith('#/showcase')) {
  // Library components resolve their strings through the reactive t(), so load
  // the locale dictionary first — same as the app's startup — to avoid a flash
  // of raw keys. (Showcase section labels are literal, not keys; see
  // ShowcaseApp's nav model.)
  void Promise.all([
    import('./ui-showcase/ShowcaseApp'),
    import('./intl').then(({ initialiseLocale, detectLocale }) =>
      initialiseLocale(detectLocale())
    ),
  ]).then(([{ ShowcaseApp }]) => {
    render(() => <ShowcaseApp />, root);
  });
} else {
  render(() => <App />, root);
}
