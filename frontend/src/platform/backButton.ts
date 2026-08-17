import { isAndroid } from './index';

// Android hardware/gesture back (spec/android § hardware back,
// kdd/capacitor-plugins): registering a backButton listener takes over from
// Capacitor's default (which closes the app). Back navigates the app's own
// history like the browser button; standing on the app's first screen it
// minimises instead — Android convention for "back out of the app", and the app
// is exactly as the user left it on return. No-op everywhere but the Android
// shell; called once at boot (src/index.tsx).
//
// The question is asked of the APP's history, never the WebView's. The APK
// leaves its own plain-HTML "starting omSupply…" loader page in the WebView
// history BELOW our first entry, and no native code manages that page.
// Capacitor's `canGoBack` counts it, so trusting `canGoBack` walks the user
// onto a dead page that looks like an endless load and needs a force-restart
// (issue #857.1) — on the very first back press from login or initialisation,
// which render in place and never push an entry of their own (spec D77).
//
// `navigation.currentEntry.index` is the current entry's position in the
// same-origin entry list, so a baseline taken at boot answers "have we
// navigated since we started" exactly. It is right either way on the loader
// page: if that page is same-origin the baseline is >= 1; if it isn't, the list
// excludes it and the baseline is 0. In both cases the app's own first screen
// sits AT the baseline. `replace` navigations (StoreGuardLayout entering a
// store) don't move the index, which is what we want — replacing the entry we
// booted on adds no step to go back to. The Navigation API is Chromium 102+,
// well inside the supported floor (spec/startup § minimum browser); the
// fallback covers only the node test environment, and minimising is the safe
// direction to fall.
export const registerAndroidBackButton = async (): Promise<void> => {
  if (!isAndroid()) return;
  const bootIndex = historyIndex();
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => {
    if (historyIndex() > bootIndex) window.history.back();
    else void App.minimizeApp();
  });
};

const historyIndex = (): number => window.navigation?.currentEntry?.index ?? 0;
