import { isAndroid } from './index';
import { t } from '../intl';

// Open a server-stored document (a domain/syncFiles URL) outside the app —
// the reference capability wrapper for kdd/capacitor-plugins. On the web the
// browser handles it (new tab / its own viewer); under the Android shell the
// WebView would render it inline instead, so the file is fetched with the
// session cookie, written to the app cache, and handed to the OS viewer
// (spec/android/behaviours.md § Files out of the app). Never throws — the
// same discriminated result shape as domain/syncFiles.

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
    const contentType = mimeOf(response.headers.get('Content-Type'));
    const bytes = new Uint8Array(await response.arrayBuffer());

    // Dynamic imports: the plugin JS never enters the eager bundle and is
    // only ever fetched on device (kdd/capacitor-plugins Fork 2).
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const written = await Filesystem.writeFile({
      path: sanitizeFileName(fileName),
      data: bytesToBase64(bytes),
      directory: Directory.Cache,
    });

    const { FileOpener } = await import('@capacitor-community/file-opener');
    try {
      await FileOpener.open({ filePath: written.uri, contentType });
    } catch {
      // The one user-fixable failure: nothing installed handles this type.
      return { ok: false, message: t('messages.cannot-open-file') };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};
