import { isAndroid } from './index';

// Android hardware/gesture back (kdd/capacitor-plugins): registering a
// backButton listener takes over from Capacitor's default (which closes the
// app). Back navigates the app's history like the browser button; with no
// history left it minimises — Android convention for "back out of the app",
// and the app is exactly as the user left it on return. No-op everywhere but
// the Android shell; called once at boot (src/index.tsx).
export const registerAndroidBackButton = async (): Promise<void> => {
  if (!isAndroid()) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
};
