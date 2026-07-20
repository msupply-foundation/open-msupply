// Pure file-acceptance logic for UploadZone — kept out of the component so it's
// unit-testable without a DOM. Mirrors react-dropzone's attr-accept matching
// (extension OR MIME type, with `type/*` wildcards) that the current app relies
// on, so a photo reported as image/jpeg with a .jfif name, or a CSV reported
// with an Excel MIME type, is judged the same way in both apps.

/** The subset of `File` this logic reads (real `File`s satisfy it). */
export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export type RejectionReason = 'type' | 'size';

export interface FileRejection<T> {
  file: T;
  reason: RejectionReason;
}

export interface PartitionOptions {
  /**
   * Comma-separated accept list — extensions (`.pdf`), exact MIME types
   * (`image/png`), or wildcards (`image/*`). Empty/undefined accepts any type.
   */
  accept?: string;
  /** Per-file byte ceiling; larger files are rejected as 'size'. */
  maxSize?: number;
}

const parseAccept = (accept?: string): string[] =>
  (accept ?? '')
    .split(',')
    .map(token => token.trim().toLowerCase())
    .filter(Boolean);

const matchesAccept = (file: FileLike, tokens: string[]): boolean => {
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some(token => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
};

/**
 * Split files into those accepted by `accept`/`maxSize` and those rejected,
 * each rejection tagged with the reason (type checked before size, as the
 * current app does). Preserves input order within each group.
 */
export const partitionFiles = <T extends FileLike>(
  files: readonly T[],
  { accept, maxSize }: PartitionOptions = {}
): { accepted: T[]; rejected: FileRejection<T>[] } => {
  const tokens = parseAccept(accept);
  const accepted: T[] = [];
  const rejected: FileRejection<T>[] = [];
  for (const file of files) {
    if (!matchesAccept(file, tokens)) rejected.push({ file, reason: 'type' });
    else if (maxSize != null && file.size > maxSize)
      rejected.push({ file, reason: 'size' });
    else accepted.push(file);
  }
  return { accepted, rejected };
};
