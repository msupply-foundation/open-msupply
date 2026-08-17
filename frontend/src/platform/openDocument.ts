import { isAndroid } from './index';
import { t } from '../intl';

// Getting a file in front of the user — the reference capability wrappers for
// kdd/capacitor-plugins. The open-vs-save verb is the CALLER's choice (a
// document tap means "look at this"; an export/download means "keep this"):
//
// - openDocument(url, fileName): view a server-stored file addressed by URL
//   (a domain/syncFiles link). Web: the browser handles it in a new tab.
//   Android: the WebView would render it inline (or silently do nothing for
//   PDFs) with no way back, so it's fetched and handed to the OS viewer,
//   falling back to the share sheet.
// - openBlob(blob, fileName): view a file the app already holds. Web: a plain
//   browser download (browsers have no "view a blob" affordance). Android:
//   OS viewer, falling back to the share sheet.
// - saveBlob(blob, fileName): keep a file the app already holds. Web: a plain
//   browser download. Android: the OS save-location picker (SAF, via our own
//   SaveFile shell plugin) — the user picks Downloads/Drive/SD card.
// - printBlob(blob, fileName): print an HTML document the app already holds.
//   Web: a hidden iframe and the system print dialog. Android: the WebView has
//   no window.print, so the HTML goes to the OS print service (PrintManager,
//   via our own Print shell plugin).
//
// All per spec/android/behaviours.md § Files out of the app. Never throws —
// the same discriminated result shape as domain/syncFiles.

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

// The Android core: cache the bytes, hand them to the OS viewer. Dynamic
// imports keep the plugin JS out of the eager bundle — only ever fetched on
// device (kdd/capacitor-plugins Fork 2).
const openBlobAndroid = async (
  blob: Blob,
  fileName: string
): Promise<OpenDocumentResult> => {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const written = await Filesystem.writeFile({
      path: sanitizeFileName(fileName),
      data: bytesToBase64(bytes),
      directory: Directory.Cache,
    });

    const { FileOpener } = await import('@capacitor-community/file-opener');
    try {
      await FileOpener.open({
        filePath: written.uri,
        contentType: mimeOf(blob.type || null),
      });
      return { ok: true };
    } catch {
      // No installed app views this type (e.g. a tablet with no PDF viewer).
      // Fall back to the OS share sheet — spec/android § Files out of the
      // app's "platform share/save flow": Drive, mail, Quick Share, print
      // services all remain available without a viewer.
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: fileName, files: [written.uri] });
        return { ok: true };
      } catch (e) {
        // Dismissing the sheet rejects too — the user saw and declined it,
        // which isn't a failure to report.
        const message = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(message)) return { ok: true };
        return { ok: false, message: t('messages.cannot-open-file') };
      }
    }
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
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) return { ok: false, message: `HTTP ${response.status}` };
    const blob = await response.blob();
    // Prefer the response's Content-Type when the blob carries none.
    const typed = blob.type
      ? blob
      : new Blob([blob], {
          type: mimeOf(response.headers.get('Content-Type')),
        });
    return openBlobAndroid(typed, fileName);
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

// Our own custom Capacitor plugin (android/.../SaveFilePlugin.java,
// registered in MainActivity — a native bridge module, unrelated to
// open-mSupply's plugin system): SAF ACTION_CREATE_DOCUMENT save picker.
// registerPlugin is idempotent enough for our use, but keep one proxy per
// session anyway.
type SaveFilePlugin = {
  save(options: {
    data: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ saved: boolean }>;
};
let saveFilePlugin: SaveFilePlugin | undefined;

export const saveBlob = async (
  blob: Blob,
  fileName: string
): Promise<SaveBlobResult> => {
  if (!isAndroid()) {
    browserDownload(blob, fileName);
    return { ok: true, saved: true };
  }
  try {
    if (!saveFilePlugin) {
      const { registerPlugin } = await import('@capacitor/core');
      saveFilePlugin = registerPlugin<SaveFilePlugin>('SaveFile');
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const { saved } = await saveFilePlugin.save({
      data: bytesToBase64(bytes),
      fileName: sanitizeFileName(fileName),
      mimeType: mimeOf(blob.type || null),
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
