// Document versions (spec/purchase-orders rules § documents and the activity
// log): a file uploaded under the SAME NAME as one already attached is a new
// version of that document, not a second document. The server keeps every
// upload as its own sync-file reference; both the grouping by file name and
// the version numbers are the client's, derived from the record's own
// documents list and needing nothing else.

export interface VersionedDocument {
  id: string;
  fileName: string;
  createdDatetime?: string | null;
  user?: { username: string } | null;
}

export interface DocumentVersionGroup<T extends VersionedDocument> {
  /** The current version — the newest file of this name. */
  latest: T;
  /** Its number, which is how many versions the document has. */
  version: number;
  /** Every earlier version with its own number, newest first. */
  previous: { document: T; version: number }[];
  /** When the document was first attached: the earliest version's upload. */
  createdDatetime: T['createdDatetime'];
  /** When it last changed: the latest version's upload. */
  modifiedDatetime: T['createdDatetime'];
  /** Who first attached it: the earliest version's uploader. */
  createdBy: string | null | undefined;
  /** Who last changed it: the latest version's uploader. */
  modifiedBy: string | null | undefined;
}

// Oldest first within a name: the upload moment, a missing moment sorting
// before any known one, and the id breaking a tie so the order — and so the
// numbering — is stable across reads.
const byUpload = <T extends VersionedDocument>(a: T, b: T): number => {
  const byDate = (a.createdDatetime ?? '').localeCompare(
    b.createdDatetime ?? ''
  );
  return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
};

/**
 * Groups a record's documents by file name into one entry per document,
 * carrying its latest version, its earlier versions and the derived
 * created/modified facts. Each version is numbered by its place in the name's
 * upload order, so removing one renumbers the versions above it. Groups keep
 * the order in which their name first appears in the input (the server lists
 * files by name).
 */
export const groupDocumentVersions = <T extends VersionedDocument>(
  documents: readonly T[]
): DocumentVersionGroup<T>[] => {
  const byName = new Map<string, T[]>();
  for (const document of documents) {
    const versions = byName.get(document.fileName);
    if (versions) versions.push(document);
    else byName.set(document.fileName, [document]);
  }
  return [...byName.values()].map(versions => {
    const ordered = [...versions].sort(byUpload);
    const first = ordered[0]!;
    const latest = ordered[ordered.length - 1]!;
    return {
      latest,
      version: ordered.length,
      previous: ordered
        .slice(0, -1)
        .map((document, index) => ({ document, version: index + 1 }))
        .reverse(),
      createdDatetime: first.createdDatetime,
      modifiedDatetime: latest.createdDatetime,
      createdBy: first.user?.username,
      modifiedBy: latest.user?.username,
    };
  });
};
