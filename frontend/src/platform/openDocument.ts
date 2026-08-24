import { isAndroid } from './index';
import { t } from '../intl';

// Getting a file in front of the user — the reference capability wrappers for
// kdd/capacitor-plugins. The open-vs-save verb is the CALLER's choice (a
// document tap means "look at this"; an export/download means "keep this"):
//
// - openDocument(url, fileName): view a server-stored file addressed by URL
//   (a domain/syncFiles link). Web: the browser handles it in a new tab.
//   Android: the WebView would render it inline (or silently do nothing for
//   PDFs) with no way back, so it's downloaded natively and handed to the OS
//   viewer, falling back to the share sheet.
// - openBlob(blob, fileName): view a file the app already holds. Web: a plain
//   browser download (browsers have no "view a blob" affordance). Android:
//   OS viewer, falling back to the share sheet.
// - saveBlob(blob, fileName): keep a file the app already holds. Web: a plain
//   browser download. Android: the OS save-location picker (SAF, via our own
//   SaveFile shell plugin) — the user picks Downloads/Drive/SD card.
// - saveDocument(url, fileName): keep a server-stored file addressed by URL —
//   openDocument's "keep this" counterpart. Web: fetched and downloaded.
//   Android: the SAF picker, then the shell streams server → the picked URI.
// - printBlob(blob, fileName): print an HTML document the app already holds.
//   Web: a hidden iframe and the system print dialog. Android: the WebView has
//   no window.print, so the HTML goes to the OS print service (PrintManager,
//   via our own Print shell plugin).
//
// All per spec/android/behaviours.md § Files out of the app. Never throws —
// the same discriminated result shape as domain/syncFiles.
//
// THE ANDROID PAYLOAD RULE (#1169, both acts): file bytes must never cross a
// process or bridge boundary unbounded.
//  - Bytes must not ride in a plugin call that launches an activity — while
//    the picker/viewer is in front, Capacitor parcels the pending call into
//    the activity's saved instance state, and Android caps that binder
//    transaction at 1MB. A ~1MB log made a 5.6MB parcel:
//    TransactionTooLargeException, app killed behind the picker.
//  - Bytes must not cross the JS bridge in one message either — Capacitor
//    re-serializes the message JSON on the Java heap, so a 40MB document
//    became a 75MB StringBuilder allocation: OutOfMemoryError, app killed.
//  So: URL-addressed files move NATIVELY — server → cache file for viewing
//  (DownloadFile plugin), server → the picked SAF URI for saving
//  (SaveFile.saveFromUrl) — and the bytes never enter JS; blobs the app
//  already holds are staged to a cache file in bounded chunks. Plugin calls
//  carry URLs and file URIs, never payloads.

export type OpenDocumentResult = { ok: boolean; message?: string };
/** `saved: false` = the user cancelled the picker — declined, not failed. */
export type SaveBlobResult =
  { ok: true; saved: boolean } | { ok: false; message: string };

// Filesystem.writeFile paths are cache-relative: keep the name flat and free
// of path/reserved characters (a slash would silently create directories).
export const sanitizeFileName = (name: string): string => {
  const flat = name.replace(/[/\\:*?"<>|]/g, '_').trim();
  return flat === '' || flat === '.' || flat === '..' ? 'file' : flat;
};

// "application/pdf; charset=binary" → "application/pdf"; the OS chooser needs
// a bare MIME type, and a missing header falls back to octet-stream.
export const mimeOf = (contentType: string | null): string => {
  const bare = contentType?.split(';')[0]?.trim();
  return bare ? bare : 'application/octet-stream';
};

// Filesystem.writeFile takes base64 on native. Chunked so large documents
// don't blow the argument limit of String.fromCharCode(...bytes).
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

// Stage a blob into a cache file, in bounded chunks (the payload rule above):
// 3MB of raw bytes → 4MB of base64 per bridge message, so the Java-side JSON
// re-serialization allocates a few MB at a time regardless of blob size.
// Returns the staged file's URI.
const STAGE_CHUNK_BYTES = 3 * 1024 * 1024;
const stageBlobInCache = async (blob: Blob, path: string): Promise<string> => {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  let uri = '';
  for (
    let offset = 0;
    offset < blob.size || offset === 0;
    offset += STAGE_CHUNK_BYTES
  ) {
    const chunk = new Uint8Array(
      await blob.slice(offset, offset + STAGE_CHUNK_BYTES).arrayBuffer()
    );
    if (offset === 0) {
      const written = await Filesystem.writeFile({
        path,
        data: bytesToBase64(chunk),
        directory: Directory.Cache,
      });
      uri = written.uri;
    } else {
      await Filesystem.appendFile({
        path,
        data: bytesToBase64(chunk),
        directory: Directory.Cache,
      });
    }
  }
  return uri;
};

// Best-effort removal of a staged cache file once its save flow is over; the
// OS clears the cache dir anyway. Files handed to the OS VIEWER are NOT
// deleted — the viewer app may still be reading them.
const deleteCached = (path: string): void => {
  void import('@capacitor/filesystem')
    .then(({ Filesystem, Directory }) =>
      Filesystem.deleteFile({ path, directory: Directory.Cache })
    )
    .catch(() => {});
};

// Our own custom Capacitor plugin (android/.../FileTransferPlugin.java,
// registered in MainActivity — a native bridge module, unrelated to
// open-mSupply's plugin system): file bytes in and out of the app, natively,
// carrying the WebView's own session cookie (CookieManager, HttpOnly
// included). One plugin, three methods — download (server → cache file, for
// the OS viewer), save (a staged cache file → the SAF pick), saveFromUrl
// (server → the SAF pick directly).
type FileTransferPlugin = {
  download(options: {
    url: string;
    fileName: string;
  }): Promise<{ uri: string; contentType?: string }>;
  save(options: {
    /** file:// URI of the staged bytes (a cache file) to copy to the pick. */
    srcUri: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ saved: boolean }>;
  /**
   * Picker first, then the shell streams server → the picked URI (no cache
   * file, bytes never enter JS). mimeType defaults from the fileName's
   * extension; readTimeoutSeconds (default 30) is for endpoints that work
   * before their first byte (the database download VACUUMs in-request).
   */
  saveFromUrl(options: {
    url: string;
    fileName: string;
    readTimeoutSeconds?: number;
  }): Promise<{ saved: boolean }>;
};
let fileTransferPlugin: FileTransferPlugin | undefined;
// Returns a PLAIN wrapper object, never the registerPlugin proxy itself: the
// proxy fabricates a native-method stub for ANY property read, so a proxy
// handed across an await has `.then` read by promise assimilation and called
// as a native method ('"FileTransfer.then()" is not implemented').
const getFileTransfer = async (): Promise<FileTransferPlugin> => {
  if (!fileTransferPlugin) {
    const { registerPlugin } = await import('@capacitor/core');
    const proxy = registerPlugin<FileTransferPlugin>('FileTransfer');
    fileTransferPlugin = {
      download: options => proxy.download(options),
      save: options => proxy.save(options),
      saveFromUrl: options => proxy.saveFromUrl(options),
    };
  }
  return fileTransferPlugin;
};

// App URLs are origin-relative (domain/syncFiles builds paths); the native
// URLConnection needs them absolute.
const absolute = (url: string): string =>
  new URL(url, window.location.href).toString();

const downloadToCache = async (
  url: string,
  fileName: string
): Promise<{ uri: string; contentType?: string }> => {
  const plugin = await getFileTransfer();
  return plugin.download({ url: absolute(url), fileName });
};

// The Android "look at this" core: hand a cached file to the OS viewer.
const openCachedAndroid = async (
  uri: string,
  fileName: string,
  contentType: string
): Promise<OpenDocumentResult> => {
  const { FileOpener } = await import('@capacitor-community/file-opener');
  try {
    await FileOpener.open({ filePath: uri, contentType });
    return { ok: true };
  } catch {
    // No installed app views this type (e.g. a tablet with no PDF viewer).
    // Fall back to the OS share sheet — spec/android § Files out of the
    // app's "platform share/save flow": Drive, mail, Quick Share, print
    // services all remain available without a viewer.
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: fileName, files: [uri] });
      return { ok: true };
    } catch (e) {
      // Dismissing the sheet rejects too — the user saw and declined it,
      // which isn't a failure to report.
      const message = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(message)) return { ok: true };
      return { ok: false, message: t('messages.cannot-open-file') };
    }
  }
};

const openBlobAndroid = async (
  blob: Blob,
  fileName: string
): Promise<OpenDocumentResult> => {
  try {
    const staged = sanitizeFileName(fileName);
    const uri = await stageBlobInCache(blob, staged);
    return openCachedAndroid(uri, fileName, mimeOf(blob.type || null));
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

export const openDocument = async (
  url: string,
  fileName: string
): Promise<OpenDocumentResult> => {
  if (!isAndroid()) {
    window.open(url, '_blank', 'noreferrer');
    return { ok: true };
  }
  try {
    // Native download under the file's real name — the share-sheet fallback
    // shows it, and the viewer may keep reading it, so it stays in the cache.
    const staged = sanitizeFileName(fileName);
    const file = await downloadToCache(url, staged);
    return openCachedAndroid(
      file.uri,
      fileName,
      mimeOf(file.contentType ?? null)
    );
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

// Browser download: object URL + a programmatic anchor click, revoked
// immediately after. The web path for both openBlob and saveBlob — a browser
// has one "here's a file" affordance and it already lets the user pick the
// destination (per their download settings).
const browserDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const openBlob = async (
  blob: Blob,
  fileName: string
): Promise<OpenDocumentResult> => {
  if (!isAndroid()) {
    browserDownload(blob, fileName);
    return { ok: true };
  }
  return openBlobAndroid(blob, fileName);
};

export const saveBlob = async (
  blob: Blob,
  fileName: string
): Promise<SaveBlobResult> => {
  if (!isAndroid()) {
    browserDownload(blob, fileName);
    return { ok: true, saved: true };
  }
  try {
    // Stage the bytes in a cache file and hand the plugin its URI — never the
    // bytes themselves (the payload rule above; carrying them in this call
    // parceled them into instance state behind the picker and killed the app,
    // #1169).
    const plugin = await getFileTransfer();
    const { generateUUID } = await import('../uuid');
    const staged = `save-${generateUUID()}`;
    const srcUri = await stageBlobInCache(blob, staged);
    try {
      const { saved } = await plugin.save({
        srcUri,
        fileName: sanitizeFileName(fileName),
        mimeType: mimeOf(blob.type || null),
      });
      return { ok: true, saved };
    } finally {
      deleteCached(staged);
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

// openDocument's "keep this" counterpart. Web: fetch (the session cookie
// authenticates) and hand the blob to the browser-download affordance.
// Android: the SAF picker opens immediately, then the shell streams the file
// from the server straight into the picked destination — no cache file, and
// the bytes never enter JS. A download failing after the pick deletes the
// partial document and lands here as the error result.
export const saveDocument = async (
  url: string,
  fileName: string,
  options?: {
    /**
     * For endpoints that do server-side work before their first byte (the
     * database download VACUUMs inside the request) — Android only; the web
     * fetch has no read timeout to widen.
     */
    readTimeoutSeconds?: number;
  }
): Promise<SaveBlobResult> => {
  if (!isAndroid()) {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok)
        return { ok: false, message: `HTTP ${response.status}` };
      return saveBlob(await response.blob(), fileName);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
  }
  try {
    const plugin = await getFileTransfer();
    const { saved } = await plugin.saveFromUrl({
      url: absolute(url),
      fileName: sanitizeFileName(fileName),
      readTimeoutSeconds: options?.readTimeoutSeconds,
    });
    return { ok: true, saved };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

// The web print path: a hidden iframe carrying the HTML via srcdoc, print()
// called once it loads, and the iframe torn down after printing (afterprint,
// with a generous timeout fallback for browsers that never fire it). The frame
// lives on document.body, outside the Solid tree, so it survives the caller's
// dialog closing behind the print dialog.
const printViaHiddenFrame = (html: string): void => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.srcdoc = html;

  let cleanedUp = false;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    iframe.remove();
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }
    frameWindow.addEventListener('afterprint', cleanup);
    // Fallback: some browsers never fire afterprint (or the user dismisses the
    // dialog without it). Tear the frame down after a generous delay
    // regardless.
    window.setTimeout(cleanup, 60_000);
    frameWindow.focus();
    frameWindow.print();
  };

  document.body.appendChild(iframe);
};

// Our own custom Capacitor plugin (android/.../PrintPlugin.java, registered in
// MainActivity), the print counterpart to SaveFilePlugin: hands HTML to
// Android's PrintManager. The server can't render PDFs on a tablet — it drives
// headless Chrome, and there is no Chrome executable to launch — so printing on
// Android MUST go through the OS rather than a generated PDF (spec/reports
// § Printing and exporting).
type PrintPlugin = {
  printHtml(options: { html: string; jobName: string }): Promise<void>;
};
let printPlugin: PrintPlugin | undefined;

export const printBlob = async (
  blob: Blob,
  fileName: string
): Promise<OpenDocumentResult> => {
  try {
    const html = await blob.text();
    if (!isAndroid()) {
      // Resolves as soon as the dialog is handed over: what the user does with
      // it (print, save as PDF, cancel) is between them and the browser.
      printViaHiddenFrame(html);
      return { ok: true };
    }
    if (!printPlugin) {
      const { registerPlugin } = await import('@capacitor/core');
      printPlugin = registerPlugin<PrintPlugin>('Print');
    }
    await printPlugin.printHtml({
      html,
      jobName: sanitizeFileName(fileName),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};
