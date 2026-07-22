// Human-readable byte sizes for the documents surface (spec: Documents tab
// "Size" column). Ported from the current app's `Formatter.fileSize` so the
// two apps render identical labels: B under 1 KiB, whole KB, one-decimal
// MB/GB. Binary (1024) units, matching the server's byte counts. Returns an
// empty string for null/undefined/negative (nothing to show).
export const formatFileSize = (bytes?: number | null): string => {
  if (bytes == null || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};
