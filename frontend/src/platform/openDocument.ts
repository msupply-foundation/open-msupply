import { isAndroid } from './index';
import { t } from '../intl';

// Getting a file in front of the user — the reference capability wrappers for
// kdd/capacitor-plugins. Two entry points with different web behaviours:
//
// - openDocument(url, fileName): a server-stored file addressed by URL (a
//   domain/syncFiles link). Web: the browser handles it in a new tab (its own
//   viewer). Android: the WebView would render it inline (or silently do
//   nothing for PDFs) with no way back, so it's fetched and handed to the OS.
// - openBlob(blob, fileName): a file the app already holds (generated report,
//   CSV export). Web: a plain browser download. Android: handed to the OS.
//
// Both route through the same Android core: write to the app cache, open with
// the OS viewer (spec/android/behaviours.md § Files out of the app). Never
// throws — the same discriminated result shape as domain/syncFiles.

export type OpenDocumentResult = { ok: boolean; message?: string };

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

export const openBlob = async (
  blob: Blob,
  fileName: string
): Promise<OpenDocumentResult> => {
  if (!isAndroid()) {
    // Browser download: object URL + a programmatic anchor click, revoked
    // immediately after.
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  }
  return openBlobAndroid(blob, fileName);
};
