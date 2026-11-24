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

export type PrintResult = { ok: true } | { ok: false; message: string };

/**
 * Print an HTML document the plugin builds itself (a standalone page with its
 * own `<style>`, `@media print` rules included): the system print dialog on the
 * web, through a hidden frame so the app around the plugin isn't printed, and
 * the OS print service on Android, whose WebView has no `window.print`. The
 * same path the host's report Print takes. Never throws.
 */
export const printHtml = async (
  html: string,
  title: string
): Promise<PrintResult> => {
  const { printBlob } = await import('../platform/openDocument');
  const result = await printBlob(
    new Blob([html], { type: 'text/html' }),
    title
  );
  return result.ok
    ? { ok: true }
    : { ok: false, message: result.message ?? 'Printing failed' };
};
