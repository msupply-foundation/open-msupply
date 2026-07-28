import { FILES_URL } from '../../config';

// Client-side file plumbing for generated reports (spec/reports "The generated
// file" / "Printing and exporting"). Dependency-free and never-throwing, in the
// non-throwing-fetch style of intl/customTranslations.ts: a failure resolves to
// a discriminated { kind: 'error' } rather than raising, so callers stay on
// their happy path.

// Parse the download filename from a content-disposition header. The file
// service sends `content-disposition: inline;
// filename="<date>_<time>_<name>.<ext>"`. Handles both the plain
// `filename="..."` and RFC 5987 `filename*=UTF-8''...` forms; returns undefined
// when neither is present or parsable.
const filenameFromDisposition = (
  disposition: string | null
): string | undefined => {
  if (!disposition) return undefined;
  // Prefer the RFC 5987 extended form when present (it carries the encoding).
  const extended = disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // Fall through to the plain form.
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : undefined;
};

// Fetch a generated report file by its handle. The endpoint is unauthenticated
// (spec/reports: handles are bearer secrets, 1-hour expiry) but we still send
// credentials same-origin to match the rest of the app. Never throws.
export const fetchReportFile = async (
  fileId: string
): Promise<
  { kind: 'success'; blob: Blob; filename: string } | { kind: 'error' }
> => {
  try {
    const response = await fetch(
      `${FILES_URL}?id=${encodeURIComponent(fileId)}`,
      { credentials: 'same-origin' }
    );
    if (!response.ok) return { kind: 'error' };
    const blob = await response.blob();
    const filename =
      filenameFromDisposition(response.headers.get('content-disposition')) ??
      fileId;
    return { kind: 'success', blob, filename };
  } catch {
    return { kind: 'error' };
  }
};
