import { describe, expect, it } from 'vitest';
import { groupDocumentVersions } from './documentVersions';

// Anchors: spec/purchase-orders/cases/OMS-FUN-PO-04.
//   .28 — a file uploaded under a listed document's name is a new version of
//         it: one row, the new upload's version number, Uploaded by and
//         Uploaded the new upload's, the earlier upload beneath it unchanged
//   .29 — a document's earlier versions are reachable from its row
//   .30 — removing a version renumbers the ones above it, and the newest
//         remaining is current
//   .31 — each version names the user who uploaded it
// (rules.md § documents and the activity log.)

const doc = (
  id: string,
  fileName: string,
  createdDatetime: string | null,
  username?: string
) => ({
  id,
  fileName,
  createdDatetime,
  user: username ? { username } : null,
});

describe('groupDocumentVersions', () => {
  it('keeps a document with one upload as its own latest, version 1', () => {
    const only = doc('a', 'po.pdf', '2026-09-01T10:00:00Z', 'alice');
    const [group] = groupDocumentVersions([only]);
    expect(group).toEqual({ latest: only, version: 1, previous: [] });
  });

  it('.28 folds same-named uploads into one document whose latest is the newest', () => {
    const v1 = doc('a', 'po.pdf', '2026-09-01T10:00:00Z', 'alice');
    const v2 = doc('b', 'po.pdf', '2026-09-03T10:00:00Z', 'bob');
    const v3 = doc('c', 'po.pdf', '2026-09-04T10:00:00Z', 'carol');
    const groups = groupDocumentVersions([v2, v1, v3]);
    expect(groups).toHaveLength(1);
    const [group] = groups;
    // The row reads the latest upload's uploader and moment; the first
    // upload keeps its own beneath it, unchanged.
    expect(group!.latest).toBe(v3);
    expect(group!.version).toBe(3);
    expect(group!.previous.map(v => v.document)).toEqual([v2, v1]);
  });

  it('.29 lists the earlier versions newest first, each under its own number', () => {
    const v1 = doc('a', 'po.pdf', '2026-09-01T10:00:00Z');
    const v2 = doc('b', 'po.pdf', '2026-09-02T10:00:00Z');
    const v3 = doc('c', 'po.pdf', '2026-09-03T10:00:00Z');
    const [group] = groupDocumentVersions([v1, v2, v3]);
    expect(group!.previous).toEqual([
      { document: v2, version: 2 },
      { document: v1, version: 1 },
    ]);
  });

  it('.30 renumbers the versions above one that is removed', () => {
    const v1 = doc('a', 'po.pdf', '2026-09-01T10:00:00Z');
    const v2 = doc('b', 'po.pdf', '2026-09-02T10:00:00Z');
    const v3 = doc('c', 'po.pdf', '2026-09-03T10:00:00Z');
    const v4 = doc('d', 'po.pdf', '2026-09-04T10:00:00Z');
    expect(groupDocumentVersions([v1, v2, v3, v4])[0]!.version).toBe(4);
    // Version 3 is gone: the numbers count what is here, so the former 4 is 3.
    const [group] = groupDocumentVersions([v1, v2, v4]);
    expect(group!.latest).toBe(v4);
    expect(group!.version).toBe(3);
    expect(group!.previous.map(v => v.version)).toEqual([2, 1]);
  });

  it('.30 makes the newest remaining version current once the latest is gone', () => {
    const v1 = doc('a', 'po.pdf', '2026-09-01T10:00:00Z', 'alice');
    const v2 = doc('b', 'po.pdf', '2026-09-02T10:00:00Z', 'bob');
    const [before] = groupDocumentVersions([v1, v2]);
    expect(before!.latest).toBe(v2);
    const [after] = groupDocumentVersions([v1]);
    expect(after!.latest).toBe(v1);
    expect(after!.version).toBe(1);
  });

  it('keeps differently named files as separate documents, in first-seen order', () => {
    const a = doc('a', 'invoice.pdf', '2026-09-01T10:00:00Z');
    const b = doc('b', 'po.pdf', '2026-09-01T10:00:00Z');
    const a2 = doc('c', 'invoice.pdf', '2026-09-02T10:00:00Z');
    const groups = groupDocumentVersions([a, b, a2]);
    expect(groups.map(group => group.latest.fileName)).toEqual([
      'invoice.pdf',
      'po.pdf',
    ]);
    expect(groups[0]!.latest).toBe(a2);
  });

  it('.31 keeps each version with its own uploader, none for one attached before uploaders were recorded', () => {
    const legacy = doc('a', 'po.pdf', '2026-01-01T10:00:00Z');
    const recent = doc('b', 'po.pdf', '2026-09-01T10:00:00Z', 'alice');
    const [group] = groupDocumentVersions([legacy, recent]);
    expect(group!.latest.user?.username).toBe('alice');
    expect(group!.previous[0]!.document.user).toBeNull();
  });

  it('numbers by upload moment, a file without one first and the id breaking a tie', () => {
    // The numbering has to be stable across reads, so the order it counts is
    // total: a missing moment sorts first, then the id.
    const undated = doc('z', 'po.pdf', null);
    const dated = doc('a', 'po.pdf', '2026-09-01T10:00:00Z');
    const sameMoment = doc('b', 'po.pdf', '2026-09-01T10:00:00Z');
    const [group] = groupDocumentVersions([sameMoment, undated, dated]);
    expect(group!.latest).toBe(sameMoment);
    expect(group!.version).toBe(3);
    expect(group!.previous).toEqual([
      { document: dated, version: 2 },
      { document: undated, version: 1 },
    ]);
  });
});
