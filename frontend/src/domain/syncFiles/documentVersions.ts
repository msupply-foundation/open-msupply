// Document versions (spec/purchase-orders rules § documents and the activity
// log): a file uploaded under the SAME NAME as one already attached is a new
// version of that document, not a second document. The server keeps every
// upload as its own sync-file reference and stamps it with a version number
// that is never reissued; the grouping by file name is the client's, and
// needs nothing beyond the record's own documents list.

export interface VersionedDocument {
  id: string;
  fileName: string;
  createdDatetime?: string | null;
  /** The server-assigned version number; a record's fragment reads it. */
  versionNumber?: number | null;
  user?: { username: string } | null;
}

export interface DocumentVersionGroup<T extends VersionedDocument> {
  /** The current version — the highest-numbered file of this name. */
  latest: T;
  /** Every earlier version, newest first. */
  previous: T[];
  /** How many versions the record still holds. */
  versionCount: number;
  /** When the document was first attached: the earliest version's upload. */
  createdDatetime: T['createdDatetime'];
  /** When it last changed: the latest version's upload. */
  modifiedDatetime: T['createdDatetime'];
  /** Who first attached it: the earliest version's uploader. */
  createdBy: string | null | undefined;
  /** Who last changed it: the latest version's uploader. */
  modifiedBy: string | null | undefined;
}

// Oldest first within a name. The server's version number orders where every
// file carries one; a file without one (a record whose fragment does not read
// it) falls back to its upload moment, a missing moment sorting before any
// known one, and the id breaks a tie so the order is stable across reads.
//
// The tie-break is load-bearing, not just defensive: a number is assigned from
// the highest the UPLOADING SITE has seen, so two sites attaching the same name
// to the same record both reach the same number and nothing rejects the
// duplicate (contract § documents and the activity log). Two versions can share
// a number, and then the upload moment and the id are all that order them.
const byVersion = <T extends VersionedDocument>(a: T, b: T): number => {
  if (a.versionNumber != null && b.versionNumber != null) {
    const byNumber = a.versionNumber - b.versionNumber;
    if (byNumber !== 0) return byNumber;
  }
  const byDate = (a.createdDatetime ?? '').localeCompare(
    b.createdDatetime ?? ''
  );
  return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
};

/**
 * Groups a record's documents by file name into one entry per document,
 * carrying its latest version, its earlier versions and the derived
 * created/modified facts. Groups keep the order in which their name first
 * appears in the input (the server lists files by name).
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
    const ordered = [...versions].sort(byVersion);
    const first = ordered[0]!;
    const latest = ordered[ordered.length - 1]!;
    return {
      latest,
      previous: ordered.slice(0, -1).reverse(),
      versionCount: ordered.length,
      createdDatetime: first.createdDatetime,
      modifiedDatetime: latest.createdDatetime,
      createdBy: first.user?.username,
      modifiedBy: latest.user?.username,
    };
  });
};

/**
 * The version number shown for one file of a group: the server's, which
 * survives the removal of an earlier version (1, 2, 4 stays 1, 2, 4). A file
 * carrying none reads by its position in upload order.
 */
export const versionNumberOf = <T extends VersionedDocument>(
  group: DocumentVersionGroup<T>,
  document: T
): number => {
  if (document.versionNumber != null) return document.versionNumber;
  if (document.id === group.latest.id) return group.versionCount;
  const index = group.previous.findIndex(
    previous => previous.id === document.id
  );
  return index < 0 ? 0 : group.versionCount - 1 - index;
};
