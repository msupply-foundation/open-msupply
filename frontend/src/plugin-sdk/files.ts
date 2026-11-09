/*
 * Getting a file out of the app (spec/android/behaviours.md § Files out of the
 * app) — the one capability a plugin cannot hand-roll correctly. On the web a
 * blob download is a few lines; on Android the WebView has no download
 * affordance at all, the bytes must be staged to a cache file in bounded
 * chunks, and the save location comes from the OS picker through our own shell
 * plugin (kdd/capacitor-plugins). A plugin that built its own anchor would
 * work in a browser and do nothing in the Android app.
 *
 * Dynamically imported, so neither the platform layer nor its Capacitor
 * plugins join the SDK barrel's eager graph — and so the barrel stays free of
 * module-scope side effects.
 */

/** `saved: false` = the user cancelled the picker — declined, not failed. */
export type SaveFileResult =
  { ok: true; saved: boolean } | { ok: false; message: string };

/**
 * Keep a file the plugin already holds: a browser download on the web, the OS
 * save-location picker on Android. Never throws.
 */
export const saveFile = async (
  blob: Blob,
  fileName: string
): Promise<SaveFileResult> => {
  const { saveBlob } = await import('../platform/openDocument');
  return saveBlob(blob, fileName);
};
