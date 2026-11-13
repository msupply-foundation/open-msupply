// Pure logic for the global logo editor (spec/global-preferences/rules.md
// § The global logo editor): the file limits, the accept list, and the data
// URL the server will take. No Solid, no FileReader — the modal composes these.
//
// The limits and MIME prefixes mirror the server's own check
// (server/service/src/preference/preferences/global_logo.rs), which refuses
// anything else; checking first lets the editor say why instead of failing
// the save.

/** Max length of the stored data URL. Must match the server's
 *  MAX_GLOBAL_LOGO_DATA_URL_LENGTH. */
export const MAX_LOGO_DATA_URL_LENGTH = 342 * 1024;

/** Raw file cap. A 250KB file's data URL (base64's 4/3 inflation plus the
 *  prefix, ~341.4KB) still fits within MAX_LOGO_DATA_URL_LENGTH. */
export const MAX_LOGO_FILE_BYTES = 250 * 1024;

export const LOGO_MAX_SIZE_LABEL = `${Math.floor(MAX_LOGO_FILE_BYTES / 1024)}KB`;

/** The image types the server accepts, each with its file extensions. */
const LOGO_TYPES: Record<string, readonly string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/svg+xml': ['.svg'],
};

/** UploadZone's accept list: each MIME type and its extensions. */
export const LOGO_ACCEPT = Object.entries(LOGO_TYPES)
  .flatMap(([mimeType, extensions]) => [mimeType, ...extensions])
  .join(',');

/*
 * The MIME type the stored data URL is prefixed with. Some platforms report
 * no type (or a different one) for a file, so fall back to its extension —
 * the prefix must always be one the server accepts. Undefined for a file of
 * any other type.
 */
export const logoMimeType = ({
  name,
  type,
}: {
  name: string;
  type: string;
}): string | undefined => {
  if (Object.hasOwn(LOGO_TYPES, type)) return type;
  const lowerName = name.toLowerCase();
  return Object.entries(LOGO_TYPES).find(([, extensions]) =>
    extensions.some(extension => lowerName.endsWith(extension))
  )?.[0];
};

/*
 * The value to store for a file read as a data URL: its payload re-prefixed
 * with `mimeType`, so the prefix is one the server accepts whatever the
 * browser reported. Undefined when the result is too long to store — the
 * authoritative size check, on what is actually sent. '' when there is no
 * payload (an empty file reads as a bare `data:`), which would store a
 * broken image.
 */
export const logoDataUrl = (
  readDataUrl: string,
  mimeType: string
): string | undefined => {
  const marker = 'base64,';
  const at = readDataUrl.indexOf(marker);
  const base64 = at === -1 ? '' : readDataUrl.slice(at + marker.length);
  if (base64 === '') return '';
  const dataUrl = `data:${mimeType};base64,${base64}`;
  return dataUrl.length > MAX_LOGO_DATA_URL_LENGTH ? undefined : dataUrl;
};

/** The served value as a data URL; '' (not set) for anything else. */
export const asLogo = (value: unknown): string =>
  typeof value === 'string' ? value : '';
